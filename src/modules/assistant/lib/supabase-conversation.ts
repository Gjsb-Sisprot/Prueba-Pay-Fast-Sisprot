import { supabase } from "./supabase";
import type { ClientContextData } from "./types";
import type { ConversationMessage } from "./mcp-types";

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
    console.error(`[SUPABASE_ERROR] Error al buscar conversación: ${error.message}`);
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
    console.error(`[SUPABASE_ERROR] Error al crear conversación: ${createError.message}`);
    return null;
  }

  return newData.id;
}

/**
 * Guarda un mensaje en la tabla chat_logs.
 */
export async function saveMessageToSupabase(params: {
  sessionId: string;
  role: string;
  content: string;
  toolName?: string;
  toolCallId?: string;
}) {
  const conversationId = await getConversationUuid(params.sessionId);
  if (!conversationId) return;

  const { error } = await supabase
    .from("chat_logs")
    .insert([{
      conversation_id: conversationId,
      role: params.role,
      content: params.content,
      tool_name: params.toolName,
      tool_call_id: params.toolCallId
    }]);

  if (error) {
    console.error(`[SUPABASE_ERROR] Error al guardar mensaje: ${error.message}`);
  }
}

/**
 * Carga el historial de mensajes desde Supabase.
 */
export async function loadHistoryFromSupabase(sessionId: string): Promise<ConversationMessage[]> {
  const { data, error } = await supabase
    .from("chat_logs")
    .select("role, content, tool_name, tool_call_id, created_at")
    .filter("conversation_id", "in", 
      supabase.from("conversations").select("id").eq("session_id", sessionId)
    )
    .order("created_at", { ascending: true });

  // Nota: La subquery 'in' arriba es una forma elegante, pero si falla usaremos el UUID directo
  if (error) {
    const conversationId = await getConversationUuid(sessionId);
    if (!conversationId) return [];
    
    const { data: directData, error: directError } = await supabase
      .from("chat_logs")
      .select("role, content, tool_name, tool_call_id")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
      
    if (directError) return [];
    return transformToMessages(directData);
  }

  return transformToMessages(data);
}

function transformToMessages(rows: any[]): ConversationMessage[] {
  return (rows || []).map(row => ({
    role: row.role as any,
    content: row.content,
    ...(row.tool_name ? { toolName: row.tool_name } : {}),
    ...(row.tool_call_id ? { toolCallId: row.tool_call_id } : {})
  }));
}

/**
 * Actualiza la información del cliente y el resumen en la tabla de conversaciones.
 */
export async function updateSupabaseConversationMetadata(params: {
  sessionId: string;
  clientData?: Partial<ClientContextData>;
  summary?: string;
  status?: string;
}) {
  const { sessionId, clientData, summary, status } = params;
  
  const updates: any = { updated_at: new Date() };
  if (summary) updates.summary = summary;
  if (status) updates.status = status;
  
  if (clientData) {
    if (clientData.identification) {
        updates.identification = clientData.identification;
        updates.user_id = clientData.identification; // Usando cedula como ID de usuario por defecto
    }
    if (clientData.contract) updates.contract = clientData.contract;
    if (clientData.sector) updates.sector = clientData.sector;
    if (clientData.name) updates.contact_name = clientData.name;
    // Si existieran email/phone en ClientContextData se podrian mapear aqui
  }

  const { error } = await supabase
    .from("conversations")
    .update(updates)
    .eq("session_id", sessionId);

  if (error) {
    console.error(`[SUPABASE_ERROR] Error al actualizar metadatos: ${error.message}`);
  }
}
