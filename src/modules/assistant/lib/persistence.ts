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
 * Guarda un mensaje en la tabla chat_logs.
 * Se encarga exclusivamente de la persistencia del historial.
 */
export async function saveInteraction(params: SaveInteractionParams): Promise<void> {
  const { sessionId, role, content, toolName, toolCallId } = params;

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
    
    // Si la interacción trae datos de cliente, sincronizamos los metadatos de forma asíncrona
    if (params.identification || params.contract || params.sector || params.contactName) {
      syncConversationMetadata(sessionId, {
        identification: params.identification,
        contract: params.contract,
        sector: params.sector,
        name: params.contactName
      }).catch(() => {});
    }

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
 * Cambia explícitamente el estado de la conversación.
 * Se usa para escalamiento a humano o cierre.
 */
export async function updateConversationStatus(
  sessionId: string,
  status: "active" | "waiting_specialist" | "closed"
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
