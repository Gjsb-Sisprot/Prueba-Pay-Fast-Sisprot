
import { 
  saveMessageToSupabase, 
  loadHistoryFromSupabase, 
  updateSupabaseConversationMetadata 
} from "./supabase-conversation";

export async function loadConversationHistory(
  _mcpClient: MCPClientType,
  sessionId: string
): Promise<ConversationMessage[]> {
  try {
    return await loadHistoryFromSupabase(sessionId);
  } catch (error) {
    console.error("[HISTORY_LOAD_ERROR]", error);
    return [];
  }
}

interface SaveInteractionParams {
  tools: MCPToolSet;
  sessionId: string;
  role: "user" | "model" | "tool";
  content: string;
  identification?: string;
  contract?: string;
  sector?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  toolCallId?: string;
  toolName?: string;
  silent?: boolean;
}

export async function saveInteraction(params: SaveInteractionParams): Promise<void> {
  const { sessionId, role, content, toolName, toolCallId, ...optionalFields } = params;

  try {
    // 1. Guardar el mensaje en logs
    await saveMessageToSupabase({
      sessionId,
      role,
      content,
      toolName,
      toolCallId
    });

    // 2. Si hay datos de cliente o es una herramienta terminal, actualizar metadatos
    const isEscalation = toolName === "escalate_to_specialist";
    const isClose = toolName === "close_conversation";
    
    const hasClientInfo = Boolean(
      optionalFields.identification ||
      optionalFields.contract ||
      optionalFields.sector ||
      optionalFields.contactName 
    );

    if (hasClientInfo || isEscalation || isClose) {
      await updateSupabaseConversationMetadata({
        sessionId,
        status: isEscalation ? "waiting_specialist" : isClose ? "closed" : undefined,
        clientData: {
          identification: optionalFields.identification,
          contract: optionalFields.contract,
          sector: optionalFields.sector,
          name: optionalFields.contactName
        }
      });
    }
  } catch (error) {
    console.error("[SAVE_INTERACTION_ERROR]", error);
  }
}

export async function updateConversationSummary(
  _tools: MCPToolSet,
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
    
    await updateSupabaseConversationMetadata({
      sessionId,
      clientData,
      summary
    });
  } catch (error) {
    console.error("[UPDATE_SUMMARY_ERROR]", error);
  }
}

function extractRequestedContract(message: string, clientData: ClientContextData): string | null {
  if (!message) return null;

  const lower = message.toLowerCase();
  const contracts = (clientData.allContracts || [])
    .map((c) => String(c.contractId).trim())
    .filter(Boolean);
  if (contracts.length === 0) return null;

  const directMatch = lower.match(/(?:contrato\s*#?\s*|#)(\d{3,})/i);
  if (directMatch) {
    const requested = directMatch[1];
    const exact = contracts.find((c) => c === requested);
    if (exact) return exact;
  }

  const prefixMatch = lower.match(/(?:empieza|comienza)\s+por\s+(\d{1,4})/i);
  if (prefixMatch) {
    const prefix = prefixMatch[1];
    const byPrefix = contracts.find((c) => c.startsWith(prefix));
    if (byPrefix) return byPrefix;
  }

  return null;
}

export async function updateSummaryFromHistory(
  _tools: MCPToolSet,
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

    await updateSupabaseConversationMetadata({
      sessionId,
      clientData,
      summary: summaryParts.join(" | ")
    });
  } catch (error) {
    console.error("[UPDATE_SUMMARY_HISTORY_ERROR]", error);
  }
}
