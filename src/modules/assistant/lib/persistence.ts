import { supabase } from "./supabase";
import type { ClientContextData } from "./types";
import type { ConversationMessage } from "./mcp-types";

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
export async function getConversationUuid(sessionId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    console.error(`[PERSISTENCE_ERROR] Error al buscar conversación: ${error.message}`);
    return null;
  }

  if (data) return data.id;

  // Si no existe, crearla
  const { data: newData, error: createError } = await supabase
    .from("conversations")
    .insert([{ 
      session_id: sessionId,
      status: "active" 
    }])
    .select("id")
    .single();

  if (createError) {
    console.error(`[PERSISTENCE_ERROR] Error al crear conversación: ${createError.message}`);
    return null;
  }

  return newData.id;
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
      .select("role, content, tool_name, tool_call_id, created_at")
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

    return transformToMessages(data as unknown as ChatLogResult[]);
  } catch (error) {
    console.error("[HISTORY_LOAD_ERROR]", error);
    return [];
  }
}

interface SaveInteractionParams {
  sessionId: string;
  role: "user" | "model" | "assistant" | "tool";
  content: string;
  identification?: string;
  contract?: string;
  sector?: string;
  contactName?: string;
  toolCallId?: string;
  toolName?: string;
}

/**
 * Guarda un mensaje y actualiza metadatos de forma atómica (lógica).
 */
export async function saveInteraction(params: SaveInteractionParams): Promise<void> {
  const { sessionId, role, content, toolName, toolCallId, ...clientInfo } = params;

  try {
    const conversationId = await getConversationUuid(sessionId);
    if (!conversationId) return;

    // 1. Guardar el mensaje en logs
    const { error: logError } = await supabase
      .from("chat_logs")
      .insert([{
        conversation_id: conversationId,
        role: role === "assistant" ? "model" : role, // Normalizar roles para la BD
        content,
        tool_name: toolName,
        tool_call_id: toolCallId
      }]);

    if (logError) throw logError;

    // 2. Si hay datos de cliente o es una herramienta terminal, actualizar metadatos
    const isEscalation = toolName === "escalate_to_specialist";
    const isClose = toolName === "close_conversation";
    
    const hasClientInfo = Boolean(
      clientInfo.identification ||
      clientInfo.contract ||
      clientInfo.sector ||
      clientInfo.contactName 
    );

    if (hasClientInfo || isEscalation || isClose) {
      const updates: ConversationUpdate = { updated_at: new Date() };
      
      if (isEscalation) updates.status = "waiting_specialist";
      if (isClose) updates.status = "closed";
      
      if (clientInfo.identification) {
        updates.identification = clientInfo.identification;
        updates.user_id = clientInfo.identification;
      }
      if (clientInfo.contract) updates.contract = clientInfo.contract;
      if (clientInfo.sector) updates.sector = clientInfo.sector;
      if (clientInfo.contactName) updates.contact_name = clientInfo.contactName;

      await supabase
        .from("conversations")
        .update(updates)
        .eq("id", conversationId);
    }
  } catch (error) {
    console.error(`[SAVE_INTERACTION_ERROR] Para sessionId ${sessionId}:`, error);
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
        updated_at: new Date()
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
}

function transformToMessages(rows: ChatLogResult[]): ConversationMessage[] {
  return (rows || []).map(row => ({
    role: (row.role === "model" ? "assistant" : row.role) as ConversationMessage["role"],
    content: row.content,
    timestamp: row.created_at,
    ...(row.tool_name ? { toolName: row.tool_name } : {}),
    ...(row.tool_call_id ? { toolCallId: row.tool_call_id } : {})
  }));
}
