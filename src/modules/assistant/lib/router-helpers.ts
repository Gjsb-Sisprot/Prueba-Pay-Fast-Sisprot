
export interface LocalTool {
  name?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  execute: (args: any, context?: any) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export type LocalToolSet = Record<string, LocalTool>;


export interface ToolCall {
  toolName: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  toolName: string;
  toolCallId: string;
  result: unknown;
  error?: string;
}


export const EXCLUDED_ROUTER_TOOLS = new Set([
  "takeover_conversation",
  "update_summary",
  "pause_conversation",
  "resume_conversation",
  "save_interaction",
  "get_session_state",
  "set_session_state",
  "delete_session_state",
  "get_conversation_status",
  "get_current_summary",
  "get_all_session_states",
  "clear_session_states",
  "set_multiple_states",
  "increment_session_state",
  "get_conversation_history",
  "list_conversations",
  "search_conversations",
  "get_pending_conversations",
  "get_active_conversations",
  "get_specialist_stats",
  "update_client_info",
  "add_knowledge",
]);

interface RouterToolFilterOptions {
  allowEscalation?: boolean;
  allowClose?: boolean;
}

export function filterToolsForRouter(tools: LocalToolSet, options: RouterToolFilterOptions = {}): LocalToolSet {
  const allowEscalation = options.allowEscalation ?? true;
  const allowClose = options.allowClose ?? true;
  const filtered: LocalToolSet = {};
  for (const [name, tool] of Object.entries(tools)) {
    if (EXCLUDED_ROUTER_TOOLS.has(name)) continue;
    if (name === "escalate_to_specialist" && !allowEscalation) continue;
    if (name === "close_conversation" && !allowClose) continue;
    filtered[name] = tool;
  }
  return filtered;
}


export const FAST_PATH_ELIGIBLE_TOOLS = new Set([
  "search_knowledge_base",
]);

export const FAST_PATH_EXCLUDED_CATEGORIES = new Set([
  "PROBLEMA_TECNICO",
  "ESCALACION",
  "CIERRE_CONFIRMADO",
  "CONSULTA_PERSONAL",
  "INFO_ADMINISTRATIVO",
  "INFO_INSTALACION",
]);


export async function executeForced(
  toolName: string,
  query: string,
  tools: LocalToolSet
): Promise<ToolResult | null> {
  const tool = tools[toolName];
  if (!tool) return null;

  try {
    const toolCallId = `forced-${Date.now()}`;
    const result = await tool.execute(
      { query },
      { messages: [], toolCallId }
    );
    return { toolName, toolCallId, result };
  } catch {
    return null;
  }
}

export async function executeForcedEscalation(
  tools: LocalToolSet,
  sessionId: string,
  reason: string
): Promise<ToolResult | null> {
  const toolName = "escalate_to_specialist";
  const tool = tools[toolName];
  if (!tool) return null;

  try {
    const toolCallId = `forced-escalate-${Date.now()}`;
    const result = await tool.execute(
      { sessionId, reason },
      { messages: [], toolCallId }
    );
    return { toolName, toolCallId, result };
  } catch {
    return null;
  }
}

export async function executeForcedClose(
  tools: LocalToolSet,
  sessionId: string,
  resolution: string
): Promise<ToolResult | null> {
  const toolName = "close_conversation";
  const tool = tools[toolName];
  if (!tool) return null;

  try {
    const toolCallId = `forced-close-${Date.now()}`;
    const result = await tool.execute(
      {
        sessionId,
        resolution,
        ticketSummary: resolution,
        closedBy: "user",
      },
      { messages: [], toolCallId }
    );
    return { toolName, toolCallId, result };
  } catch {
    return null;
  }
}


export function extractStepResults(steps: unknown[]) {
  const toolCalls: ToolCall[] = [];
  const toolResults: ToolResult[] = [];

  if (!steps) return { toolCalls, toolResults };

  for (const step of steps) {
    const s = step as {
      toolCalls?: Array<{ toolName: string; input?: Record<string, unknown> }>;
      toolResults?: Array<{ toolName: string; toolCallId: string; output?: unknown }>;
    };

    if (s.toolCalls?.length) {
      for (const tc of s.toolCalls) {
        toolCalls.push({
          toolName: tc.toolName,
          args: tc.input || {},
        });
      }
    }
    if (s.toolResults?.length) {
      for (const tr of s.toolResults) {
        toolResults.push({
          toolName: tr.toolName,
          toolCallId: tr.toolCallId,
          result: tr.output,
        });
      }
    }
  }

  return { toolCalls, toolResults };
}

export function patchMissingResults(toolCalls: ToolCall[], toolResults: ToolResult[]) {
  if (toolCalls.length <= toolResults.length) return;

  const resolved = new Set(toolResults.map((tr) => tr.toolName));

  for (const tc of toolCalls) {
    if (!resolved.has(tc.toolName)) {
      toolResults.push({
        toolName: tc.toolName,
        toolCallId: `error-${tc.toolName}-${Date.now()}`,
        result: {
          success: false,
          error: `La herramienta ${tc.toolName} no pudo ejecutarse. Continúa con la información disponible.`,
        },
        error: `Tool ${tc.toolName} no devolvió resultado`,
      });
    }
  }
}

export function isHighDemandError(error: unknown): boolean {
  const msg = String(error).toLowerCase();
  return msg.includes("high demand") || msg.includes("503") || msg.includes("overloaded") || msg.includes("resource_exhausted") || msg.includes("resource exhausted");
}
