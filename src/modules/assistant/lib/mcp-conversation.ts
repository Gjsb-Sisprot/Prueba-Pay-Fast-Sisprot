
import type { ClientContextData } from "./types";
import type { MCPClientType, MCPToolSet, ConversationMessage } from "./mcp-types";


export async function loadConversationHistory(
  mcpClient: MCPClientType,
  sessionId: string
): Promise<ConversationMessage[]> {
  try {
    const result = await mcpClient.readResource({
      uri: `conversation://${sessionId}/history`,
    });

    if (result.contents && result.contents.length > 0) {
      const content = result.contents[0];
      if ("text" in content && typeof content.text === "string") {
        const parsed = JSON.parse(content.text);

        let history: ConversationMessage[];
        if (Array.isArray(parsed)) {
          history = parsed;
        } else if (parsed.messages && Array.isArray(parsed.messages)) {
          history = parsed.messages;
        } else {
          return [];
        }

        return history;
      }
    }

    return [];
  } catch {
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
  const { tools, sessionId, role, content, ...optionalFields } = params;

  try {
    const saveInteractionTool = tools["save_interaction"];
    if (!saveInteractionTool) return;

    const updateClientInfoTool = tools["update_client_info"];
    const hasClientInfo = Boolean(
      optionalFields.identification ||
      optionalFields.contract ||
      optionalFields.sector ||
      optionalFields.contactName ||
      optionalFields.contactEmail ||
      optionalFields.contactPhone
    );

    if (updateClientInfoTool && hasClientInfo) {
      const clientInfoArgs: Record<string, unknown> = { sessionId };
      if (optionalFields.identification) clientInfoArgs.identification = optionalFields.identification;
      if (optionalFields.contract) clientInfoArgs.contract = optionalFields.contract;
      if (optionalFields.sector) clientInfoArgs.sector = optionalFields.sector;
      if (optionalFields.contactName) clientInfoArgs.contactName = optionalFields.contactName;
      if (optionalFields.contactEmail) clientInfoArgs.contactEmail = optionalFields.contactEmail;
      if (optionalFields.contactPhone) clientInfoArgs.contactPhone = optionalFields.contactPhone;

      await updateClientInfoTool.execute(clientInfoArgs, {
        messages: [],
        toolCallId: `update-client-info-${Date.now()}`,
      });
    }

    const args: Record<string, unknown> = { sessionId, role, content };
    if (optionalFields.identification) args.identification = optionalFields.identification;
    if (optionalFields.contract) args.contract = optionalFields.contract;
    if (optionalFields.sector) args.sector = optionalFields.sector;
    if (optionalFields.contactName) args.contactName = optionalFields.contactName;
    if (optionalFields.contactEmail) args.contactEmail = optionalFields.contactEmail;
    if (optionalFields.contactPhone) args.contactPhone = optionalFields.contactPhone;
    if (optionalFields.toolCallId) args.toolCallId = optionalFields.toolCallId;
    if (optionalFields.toolName) args.toolName = optionalFields.toolName;
    if (optionalFields.silent) args.silent = optionalFields.silent;

    await saveInteractionTool.execute(args, {
      messages: [],
      toolCallId: `save-${Date.now()}`,
    });
  } catch {
  }
}


export async function updateConversationSummary(
  tools: MCPToolSet,
  sessionId: string,
  clientData: ClientContextData,
  latestUserMessage?: string
): Promise<void> {
  try {
    const updateSummaryTool = tools["update_summary"];
    if (!updateSummaryTool) return;

    const normalizedLatestMessage = latestUserMessage?.trim() || "";

    const summaryParts: string[] = [];
    if (clientData.name) summaryParts.push(`Cliente: ${clientData.name}`);
    if (clientData.identification) summaryParts.push(`Cédula: ${clientData.identification}`);
    if (clientData.contract) summaryParts.push(`Contrato: ${clientData.contract}`);
    if (clientData.sector) summaryParts.push(`Sector: ${clientData.sector}`);
    if (clientData.serviceStatus) {
      const statusText = clientData.serviceStatus === "active" ? "Activo"
        : clientData.serviceStatus === "suspended" ? "Suspendido"
          : clientData.serviceStatus;
      summaryParts.push(`Estado: ${statusText}`);
    }
    if (clientData.hasDebt && clientData.debtAmount) {
      summaryParts.push(`Deuda: $${clientData.debtAmount.toFixed(2)}`);
    }

    if (normalizedLatestMessage) {
      summaryParts.push(`Solicitud: ${normalizedLatestMessage.substring(0, 180)}`);
    }

    const explicitContract = extractRequestedContract(normalizedLatestMessage, clientData);
    if (explicitContract) {
      summaryParts.push(`Contrato solicitado: ${explicitContract}`);
    }

    if (summaryParts.length === 0) return;

    await updateSummaryTool.execute(
      { sessionId, summary: summaryParts.join(" | ") },
      { messages: [], toolCallId: `update-summary-${Date.now()}` }
    );
  } catch {
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
  tools: MCPToolSet,
  sessionId: string,
  history: ConversationMessage[],
  clientData?: ClientContextData
): Promise<void> {
  try {
    const updateSummaryTool = tools["update_summary"];
    if (!updateSummaryTool) return;

    const recentMessages = history.slice(-10);
    const topics: string[] = [];

    for (const msg of recentMessages) {
      if (msg.role === "user" && msg.content.length > 10) {
        const content = msg.content.toLowerCase();
        if (content.includes("onu") || content.includes("serial")) topics.push("ONU");
        if (content.includes("factura") || content.includes("pago")) topics.push("Facturación");
        if (content.includes("lento") || content.includes("velocidad")) topics.push("Velocidad");
        if (content.includes("sin internet") || content.includes("no conecta")) topics.push("Conexión");
        if (content.includes("técnico") || content.includes("visita")) topics.push("Soporte");
      }
    }

    const uniqueTopics = [...new Set(topics)];
    const lastUserMessage = [...recentMessages]
      .reverse()
      .find((msg) => msg.role === "user" && msg.content.trim().length > 0)?.content?.trim();

    const summaryParts: string[] = [];
    if (clientData?.identification) summaryParts.push(`Cliente: ${clientData.identification}`);
    if (clientData?.contract) summaryParts.push(`Contrato: ${clientData.contract}`);
    if (uniqueTopics.length > 0) summaryParts.push(`Temas: ${uniqueTopics.join(", ")}`);
    if (lastUserMessage) {
      summaryParts.push(`Última solicitud: ${lastUserMessage.substring(0, 180)}`);
      if (clientData) {
        const requested = extractRequestedContract(lastUserMessage, clientData);
        if (requested) summaryParts.push(`Contrato solicitado: ${requested}`);
      }
    }
    summaryParts.push(`Mensajes: ${history.length}`);

    await updateSummaryTool.execute(
      { sessionId, summary: summaryParts.join(" | ") },
      { messages: [], toolCallId: `update-summary-history-${Date.now()}` }
    );
  } catch {
  }
}
