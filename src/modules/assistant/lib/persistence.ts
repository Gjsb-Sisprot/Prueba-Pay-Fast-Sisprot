import { supabase } from "./supabase";
import type { ClientContextData, ConversationMessage } from "./types";

interface ChatLogResult {
  role: string;
  content: string;
  created_at: string;
  tool_name?: string;
  tool_call_id?: string;
}

interface ConversationUpdate {
  updated_at: Date;
  status?: string;
  identification?: string;
  user_id?: string;
  contract?: string;
  sector?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  summary?: string;
  specialist_name?: string;
  escalation_reason?: string;
  glpi_ticket_id?: number;
  visit_date?: string | Date;
  visit_time?: string;
}

/**
 * Persistencia Directa en Supabase para el Asistente
 * ------------------------------------------------
 * Este módulo maneja el almacenamiento de logs y metadatos de conversación
 * sin depender de intermediarios MCP.
 */

/**
 * Busca el UUID interno de una conversación basado en su session_id.
 * Si no existe, la crea.
 */
export async function getConversationUuid(
  sessionId: string, 
  initialMetadata?: Partial<ClientContextData>
): Promise<string | null> {
  if (!sessionId) {
    console.error("[PERSISTENCE_CRITICAL] sessionId vacío o nulo.");
    return null;
  }

  // 1. Intentar buscar primero
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    console.error(`[SUPABASE_QUERY_ERROR] ${sessionId}:`, error.message);
    return null;
  }

  if (data?.id) return data.id;

  // 2. Si no existe, intentar crearla
  console.log(`[PERSISTENCE_INFO] Creando nueva sesión en DB: ${sessionId}`);
  
  const insertData: {
    session_id: string;
    status: string;
    identification?: string;
    user_id?: string;
    contract?: string;
    sector?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
  } = { 
    session_id: sessionId,
    status: "active" 
  };

  if (initialMetadata) {
    if (initialMetadata.identification) {
      insertData.identification = initialMetadata.identification;
      insertData.user_id = initialMetadata.identification;
    }
    if (initialMetadata.contract) insertData.contract = initialMetadata.contract;
    if (initialMetadata.sector) insertData.sector = initialMetadata.sector;
    if (initialMetadata.name) insertData.contact_name = initialMetadata.name;
    if (initialMetadata.email) insertData.contact_email = initialMetadata.email;
    if (initialMetadata.phone) insertData.contact_phone = initialMetadata.phone;
  }

  const { data: newData, error: createError } = await supabase
    .from("conversations")
    .insert([insertData])
    .select("id");

  if (createError) {
    // Si el error es de duplicado (carrera), intentamos buscar por última vez
    if (createError.code === '23505') {
       const { data: retryData } = await supabase
         .from("conversations")
         .select("id")
         .eq("session_id", sessionId)
         .maybeSingle();
       if (retryData?.id) return retryData.id;
    }
    
    console.error(`[SUPABASE_INSERT_ERROR] ${sessionId}:`, createError.message);
    return null;
  }

  const newId = newData?.[0]?.id;
  if (!newId) {
    console.warn(`[PERSISTENCE_WARNING] Insert exitoso para ${sessionId} pero no devolvió ID.`);
  }

  return newId || null;
}

/**
 * Obtiene el detalle de una conversación.
 */
export async function getConversationBySessionId(sessionId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Lista conversaciones con filtros.
 */
export async function listConversations(params: { 
  identification?: string; 
  status?: string; 
  limit?: number;
}) {
  let query = supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  if (params.identification) {
    query = query.eq("identification", params.identification);
  }
  if (params.status) {
    query = query.eq("status", params.status);
  }
  if (params.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Carga el historial de mensajes desde Supabase.
 */
export async function loadConversationHistory(sessionId: string): Promise<ConversationMessage[]> {
  try {
    const conversationId = await getConversationUuid(sessionId);
    if (!conversationId) return [];

    const { data, error } = await supabase
      .from("chat_logs")
      .select("role, content, tool_name, tool_call_id, attachments, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[PERSISTENCE_ERROR] Error cargando historial:", error);
      return [];
    }

    return transformToMessages(data as unknown as ChatLogResult[]);
  } catch (error) {
    console.error("[PERSISTENCE_CRITICAL] Fallo en carga de historial:", error);
    return [];
  }
}
interface SaveInteractionParams {
  sessionId: string;
  role: "user" | "model" | "assistant" | "tool";
  content: string;
  attachments?: import("./types").MediaAttachment[];
  identification?: string;
  contract?: string;
  sector?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  toolCallId?: string;
  toolName?: string;
}

/**
 * Guarda un mensaje en la tabla chat_logs.
 * Se encarga exclusivamente de la persistencia del historial.
 */
export async function saveInteraction(params: SaveInteractionParams): Promise<void> {
  const { sessionId, role, content, toolName, toolCallId } = params;

  try {
    const conversationId = await getConversationUuid(sessionId);
    if (!conversationId) {
      console.warn(`[SAVE_INTERACTION_ABANDONED] No se pudo obtener UUID para sesión ${sessionId}. Mensaje de rol ${role} no guardado.`);
      return;
    }

    // 0. Subir adjuntos si existen
    let processedAttachments: import("./types").MediaAttachment[] = [];
    if (params.attachments && params.attachments.length > 0) {
      processedAttachments = await uploadAttachmentsToStorage(sessionId, params.attachments);
    }

    // 1. Guardar el mensaje en logs
    const { error: logError } = await supabase
      .from("chat_logs")
      .insert([{
        conversation_id: conversationId,
        role: role === "assistant" ? "model" : role, // Normalizar roles para la BD
        content,
        tool_name: toolName,
        tool_call_id: toolCallId,
        attachments: processedAttachments
      }]);

    if (logError) {
      console.error(`[SUPABASE_SAVE_ERROR] Error al guardar interacción (${role}):`, {
        code: logError.code,
        message: logError.message,
        details: logError.details,
        hint: logError.hint
      });
      throw logError;
    }

    console.log(`[PERSISTENCE_SUCCESS] Mensaje (${role}) guardado en DB para convo ${conversationId}`);
    
    // Sincronizamos los metadatos y actualizamos el timestamp de la conversación
    syncConversationMetadata(sessionId, {
      identification: params.identification,
      contract: params.contract,
      sector: params.sector,
      name: params.contactName,
      email: params.contactEmail,
      phone: params.contactPhone
    }).catch(() => {});

  } catch (error) {
    console.error(`[SAVE_INTERACTION_ERROR] Para sessionId ${sessionId}:`, error);
  }
}

/**
 * Actualiza la información del cliente en la conversación.
 * No afecta el estado (humano/bot) de la misma.
 */
export async function syncConversationMetadata(
  sessionId: string, 
  data: Partial<ClientContextData>
): Promise<void> {
  try {
    const conversationId = await getConversationUuid(sessionId);
    if (!conversationId) return;

    const updates: Partial<ConversationUpdate> = { updated_at: new Date() };
    
    if (data.identification) {
      updates.identification = data.identification;
      updates.user_id = data.identification;
    }
    if (data.contract) updates.contract = data.contract;
    if (data.sector) updates.sector = data.sector;
    if (data.name) updates.contact_name = data.name;
    if (data.email) updates.contact_email = data.email;
    if (data.phone) updates.contact_phone = data.phone;
    if (data.glpiTicketId) updates.glpi_ticket_id = typeof data.glpiTicketId === 'string' ? parseInt(data.glpiTicketId) : data.glpiTicketId;
    if (data.summary) updates.summary = data.summary;
    if (data.reason) updates.escalation_reason = data.reason;
    if (data.specialistName) updates.specialist_name = data.specialistName;
    if (data.visitDate) updates.visit_date = data.visitDate;
    if (data.visitTime) updates.visit_time = data.visitTime;

    const { error } = await supabase
      .from("conversations")
      .update(updates)
      .eq("id", conversationId);

    if (error) throw error;
  } catch (error) {
    console.error("[SYNC_METADATA_ERROR]", error);
  }
}

/**
 * Obtiene eventos recientes de una conversación (mensajes y estado).
 * Se usa para el polling de SSE.
 */
export async function getConversationEvents(sessionId: string, lastSeenDate: string) {
  try {
    const conversation = await getConversationBySessionId(sessionId);
    if (!conversation) return { messages: [], status: "closed" };

    const { data: messages, error } = await supabase
      .from("chat_logs")
      .select("role, content, attachments, created_at")
      .eq("conversation_id", conversation.id)
      .gt("created_at", lastSeenDate)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return {
      messages: (messages || []).map(m => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments,
        timestamp: m.created_at
      })),
      status: conversation.status,
      glpiTicketId: conversation.glpi_ticket_id,
      specialistName: conversation.specialist_name,
      reason: conversation.escalation_reason,
      updatedAt: conversation.updated_at
    };
  } catch (error) {
    console.error("[GET_EVENTS_ERROR]", error);
    return { messages: [], status: "active" };
  }
}

/**
 * Cambia explícitamente el estado de la conversación.
 * Se usa para escalamiento a humano o cierre.
 */
export async function updateConversationStatus(
  sessionId: string,
  status: "active" | "waiting_specialist" | "closed" | "handed_over"
): Promise<void> {
  try {
    const conversationId = await getConversationUuid(sessionId);
    if (!conversationId) return;

    const { error } = await supabase
      .from("conversations")
      .update({ 
        status, 
        updated_at: new Date() 
      })
      .eq("id", conversationId);

    if (error) throw error;
    console.log(`[STATUS_UPDATE] Conversación ${sessionId} cambiada a: ${status}`);
  } catch (error) {
    console.error("[UPDATE_STATUS_ERROR]", error);
  }
}

/**
 * Actualiza el resumen de la conversación para el panel de Handover.
 */
export async function updateConversationSummary(
  sessionId: string,
  clientData: ClientContextData,
  latestUserMessage?: string
): Promise<void> {
  try {
    const normalizedLatestMessage = latestUserMessage?.trim() || "";
    const summaryParts: string[] = [];
    
    if (clientData.name) summaryParts.push(`Cliente: ${clientData.name}`);
    if (clientData.contract) summaryParts.push(`Contrato: ${clientData.contract}`);
    if (clientData.serviceStatus) summaryParts.push(`Estado: ${clientData.serviceStatus}`);
    
    if (normalizedLatestMessage) {
      summaryParts.push(`Última solicitud: ${normalizedLatestMessage.substring(0, 100)}...`);
    }

    const summary = summaryParts.join(" | ");
    
    const conversationId = await getConversationUuid(sessionId);
    if (!conversationId) return;

    await supabase
      .from("conversations")
      .update({
        summary,
        identification: clientData.identification,
        contract: clientData.contract,
        sector: clientData.sector,
        contact_name: clientData.name,
        updated_at: new Date(),
        metadata: {
          allContracts: clientData.allContracts,
          ipActual: clientData.ipActual,
          vlanActual: clientData.vlanActual,
          gponSerial: clientData.gponSerial,
          planContratado: clientData.planName,
          direccion: clientData.address,
        }
      })
      .eq("id", conversationId);

  } catch (error) {
    console.error("[UPDATE_SUMMARY_ERROR]", error);
  }
}

/**
 * Helper para actualizar resumen desde el historial.
 */
export async function updateSummaryFromHistory(
  sessionId: string,
  history: ConversationMessage[],
  clientData?: ClientContextData
): Promise<void> {
  try {
    const lastUserMessage = [...history]
      .reverse()
      .find((msg) => msg.role === "user" && msg.content.trim().length > 0)?.content?.trim();

    if (!lastUserMessage && !clientData) return;

    const summaryParts: string[] = [];
    if (clientData?.identification) summaryParts.push(`ID: ${clientData.identification}`);
    if (clientData?.contract) summaryParts.push(`Contrato: ${clientData.contract}`);
    if (lastUserMessage) summaryParts.push(`Tema: ${lastUserMessage.substring(0, 150)}`);

    const conversationId = await getConversationUuid(sessionId);
    if (!conversationId) return;

    await supabase
      .from("conversations")
      .update({
        summary: summaryParts.join(" | "),
        updated_at: new Date()
      })
      .eq("id", conversationId);
  } catch (error) {
    console.error("[UPDATE_SUMMARY_HISTORY_ERROR]", error);
  }
}

/**
 * Obtiene los horarios ocupados para una fecha específica.
 */
export async function getOccupiedSlots(date: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("support_visits")
      .select("visit_date")
      .gte("visit_date", `${date}T00:00:00`)
      .lte("visit_date", `${date}T23:59:59`)
      .not("status", "eq", "cancelled");

    if (error) throw error;

    return (data || []).map((v: { visit_date: string }) => {
      const d = new Date(v.visit_date);
      const h = d.getHours();
      const m = d.getMinutes();
      const ampm = h >= 12 ? "PM" : "AM";
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return `${displayHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
    });
  } catch (error) {
    console.error("[GET_OCCUPIED_SLOTS_ERROR]", error);
    return [];
  }
}

/**
 * Registra una visita técnica oficial en la tabla support_visits.
 */
export async function createSupportVisit(
  sessionId: string,
  date: string,
  time: string,
  reason: string,
  category: 'support' | 'administration' = 'support',
  glpiTicketId?: string,
  technicianId?: string | number
) {
  try {
    let conversation = await getConversationBySessionId(sessionId);
    
    // 🚀 BLINDAJE: Si la conversación no existe, la creamos de emergencia para tener un UUID válido
    if (!conversation) {
      console.log(`[PERSISTENCE] Creando conversación de emergencia para sesión ${sessionId}`);
      const newId = await getConversationUuid(sessionId);
      if (newId) {
        conversation = await getConversationBySessionId(sessionId);
      }
    }

    if (!conversation?.id) {
      throw new Error(`No se pudo obtener un UUID válido para la sesión ${sessionId}`);
    }

    // Construir fecha completa
    const [t, ampmRaw] = time.split(" ");
    const ampm = ampmRaw ? ampmRaw.toUpperCase().replace(/\./g, "") : "";
    const [hoursRaw, minutes] = t.split(":").map(Number);
    let hours = hoursRaw;
    
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;

    // Normalizar fecha (soportar YYYY-MM-DD y DD/MM/YYYY)
    let normalizedDate = date;
    if (date.includes("/")) {
      const parts = date.split("/");
      if (parts.length === 3) {
        // Asumimos DD/MM/YYYY
        normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    const visitDate = new Date(normalizedDate + "T00:00:00");
    // Ajustamos a UTC considerando que la hora proporcionada es VET (UTC-4)
    // Para obtener UTC: UTC = VET + 4
    visitDate.setUTCHours(hours + 4, minutes, 0, 0);

    const { data, error } = await supabase
      .from("support_visits")
      .insert([{
        client_name: conversation.contact_name || conversation.name || "Cliente AI",
        client_identification: conversation.identification || "",
        contract_number: conversation.contract || "",
        visit_date: visitDate.toISOString(),
        reason: reason || "Agendado por Susana AI",
        status: "scheduled",
        glpi_ticket_id: glpiTicketId || conversation.glpi_ticket_id || null,
        technician_id: technicianId 
          ? (typeof technicianId === 'string' && technicianId.includes('-') 
              ? technicianId 
              : `00000000-0000-0000-0000-${technicianId.toString().padStart(12, '0')}`)
          : null,
        conversation_id: conversation.id, // UUID garantizado
        metadata: {
          source: "susana_ai",
          original_time: time
        },
        category: category,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    
    // Sincronizar metadatos en la conversación
    await syncConversationMetadata(sessionId, {
      visitDate: date,
      visitTime: time
    });



    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("[CREATE_SUPPORT_VISIT_ERROR]", message);
    return { success: false, error: message };
  }
}


function transformToMessages(rows: {
  role: string;
  content: string;
  created_at: string;
  attachments?: import("./types").MediaAttachment[];
  tool_name?: string;
  tool_call_id?: string;
}[]): ConversationMessage[] {
  return (rows || []).map(row => ({
    role: (row.role === "model" ? "assistant" : row.role) as ConversationMessage["role"],
    content: row.content,
    timestamp: row.created_at,
    attachments: row.attachments || [],
    ...(row.tool_name ? { toolName: row.tool_name } : {}),
    ...(row.tool_call_id ? { toolCallId: row.tool_call_id } : {})
  }));
}

/**
 * Sube adjuntos a Supabase Storage.
 */
async function uploadAttachmentsToStorage(
  sessionId: string, 
  attachments: import("./types").MediaAttachment[]
): Promise<import("./types").MediaAttachment[]> {
  const processed = [];
  
  for (const att of attachments) {
    try {
      if (!att.url || !att.url.startsWith("data:")) {
        processed.push(att);
        continue;
      }

      // Extraer base64
      const matches = att.url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        processed.push(att);
        continue;
      }

      const contentType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const fileName = att.fileName || `file_${Date.now()}`;
      const filePath = `${sessionId}/${Date.now()}_${fileName}`;

      const { data, error } = await supabase.storage
        .from("chat-attachments")
        .upload(filePath, buffer, {
          contentType,
          upsert: true
        });

      if (error) throw error;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from("chat-attachments")
        .getPublicUrl(filePath);

      processed.push({
        ...att,
        url: publicUrl,
        storagePath: data.path
      });
      
      console.log(`[STORAGE_SUCCESS] Archivo subido: ${filePath}`);
    } catch (err) {
      console.error("[STORAGE_UPLOAD_ERROR]", err);
      processed.push(att); // Fallback al original si falla la subida
    }
  }
  
  return processed;
}

/**
 * Obtiene el historial completo de la conversación formateado como texto plano.
 * Se usa para generar resúmenes automáticos en los tickets de GLPI.
 */
export async function getConversationTranscript(sessionId: string): Promise<string> {
  try {
    const conversation = await getConversationBySessionId(sessionId);
    if (!conversation) return "No se encontró el historial de la conversación.";

    const { data: logs, error } = await supabase
      .from("chat_logs")
      .select("role, content, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    if (!logs || logs.length === 0) return "El historial de la conversación está vacío.";

    return logs
      .map(log => {
        const speaker = log.role === "user" ? "Cliente" : "Susana (IA)";
        return `[${new Date(log.created_at).toLocaleTimeString()}] ${speaker}: ${log.content}`;
      })
      .join("\n");
  } catch (error) {
    console.error("[GET_TRANSCRIPT_ERROR]", error);
    return "Error al recuperar el historial de la conversación.";
  }
}
