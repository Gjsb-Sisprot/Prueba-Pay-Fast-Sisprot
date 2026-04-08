
import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { DEFAULT_ASSISTANT_CONFIG, CLOSE_OFFER_PREFIX, PAYMENT_ACTION_PREFIX } from "@/modules/assistant/lib/types";
import type { ConversationMessage } from "@/modules/assistant/lib/mcp-services";

import {
  type MCPToolSet,
  loadConversationHistory,
  saveInteraction,
  updateConversationSummary,
  updateSummaryFromHistory,
} from "@/modules/assistant/lib/mcp-services";

import {
  type ChatRequestBody,
  extractTextContent,
  getLastUserMessage,
} from "@/modules/assistant/lib/message-processor";

import { routeRequest, type ToolResult } from "@/modules/assistant/lib/router-agent";
import { generateResponse, generateResponseBuffered } from "@/modules/assistant/lib/solver-agent";
import { getClientFromMCP } from "@/modules/assistant/lib/mcp-client-data";
import type { ClientContextData } from "@/modules/assistant/lib/types";

import {
  errorResponse,
  createTextStreamResponse,
  saveModelAndCleanup,
  createResilientStreamResponse,
} from "./helpers";
import {
  SISPROT_NETWORKS_QUERY,
} from "@/modules/assistant/lib/channel-links";


const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "https://mcp-hono-production.up.railway.app";
const MCP_API_KEY = process.env.MCP_API_KEY || "";
const TERMINAL_TOOLS = new Set(["escalate_to_specialist", "close_conversation"]);
const TRUNCATION_THRESHOLD = 150;
const EMPTY_RESPONSE_FALLBACK = "Disculpa, tuve un inconveniente procesando tu mensaje. ¿Podrías repetir tu pregunta?";
const SOLVER_FLASH_MODEL = process.env.SOLVER_FLASH_MODEL?.trim() || "gemini-1.5-flash";
const SOLVER_PRO_MODEL = process.env.SOLVER_PRO_MODEL?.trim() || process.env.SOLVER_PRIMARY_MODEL?.trim() || "gemini-1.5-pro";


export const maxDuration = 300;

const PAYMENT_ACTION_TOKEN_REGEX = /(?:__PAYMENT_ACTION__|PAYMENT_ACTION)\s*:?/gi;
const TECHNICAL_TOKEN_REGEX = /fcl_[a-z0-9_]+|fcall_[a-z0-9_]+|\[TOOL_CALL:[a-z0-9_]+\]/gi;

function stripUiControlTokens(content: string): string {
  let cleaned = content;

  if (cleaned.startsWith(CLOSE_OFFER_PREFIX)) {
    cleaned = cleaned.slice(CLOSE_OFFER_PREFIX.length);
  }

  if (cleaned.startsWith(PAYMENT_ACTION_PREFIX)) {
    cleaned = cleaned.slice(PAYMENT_ACTION_PREFIX.length);
  }

  return cleaned
    .replace(PAYMENT_ACTION_TOKEN_REGEX, "")
    .replace(TECHNICAL_TOKEN_REGEX, "")
    .trim();
}

function buildSolverHistory(
  conversationHistory: ConversationMessage[],
  frontendMessages: ChatRequestBody["messages"]
) {
  if (frontendMessages && frontendMessages.length > 1) {
    // The last message is the current user request, so we exclude it to prevent duplication
    const historySlice = frontendMessages.slice(0, -1);
    return historySlice
      .filter(msg => msg.role === "user" || msg.role === "assistant")
      .map(msg => ({
        role: msg.role === "assistant" ? "assistant" as const : "user" as const,
        content: extractTextContent(msg),
      }));
  }

  return conversationHistory
    .filter(msg => msg.role !== "tool")
    .map(msg => ({
      role: msg.role === "model" ? "assistant" as const : "user" as const,
      content: msg.content,
    }));
}

function buildRouterHistory(
  conversationHistory: ConversationMessage[],
  frontendMessages: ChatRequestBody["messages"]
) {
  if (frontendMessages.length > 1) {
    return frontendMessages
      .filter(msg => msg.role === "user" || msg.role === "assistant")
      .map(msg => ({
        role: msg.role === "assistant" ? "assistant" as const : "user" as const,
        content: extractTextContent(msg).trim(),
      }))
      .filter(msg => msg.content.length > 0);
  }

  return conversationHistory
    .map(msg => ({
      role: msg.role === "model" ? "assistant" as const : msg.role,
      content: msg.content,
    }))
    .filter(msg => msg.content.trim().length > 0);
}

function persistToolResultsInBackground(
  tools: MCPToolSet,
  sessionId: string,
  toolResults: ToolResult[],
  clientData?: ChatRequestBody["clientData"]
) {
  for (const tr of toolResults) {
    const resultStr = typeof tr.result === "string" ? tr.result : JSON.stringify(tr.result);

    saveInteraction({
      tools,
      sessionId,
      role: "tool",
      content: resultStr.substring(0, 5000),
      identification: clientData?.identification,
      contract: clientData?.contract,
      toolCallId: tr.toolCallId,
      toolName: tr.toolName,
    }).catch(() => {});
  }
}



export async function POST(request: Request) {
  let mcpClient: MCPClient | null = null;

  try {
    const body = (await request.json()) as ChatRequestBody;
    const { messages, sessionId, config, loadHistoryOnly, clientData } = body;
    let activeClientData: ClientContextData | undefined = clientData;

    if (!messages || !Array.isArray(messages)) {
      return errorResponse("Mensajes requeridos", 400);
    }

    if (!sessionId) {
      return errorResponse("sessionId requerido", 400);
    }


    let tools: MCPToolSet = {};
    let conversationHistory: ConversationMessage[] = [];
    let userSavePromise: Promise<void> | null = null;
    let summaryPromise: Promise<void> | null = null;

    try {

      mcpClient = await createMCPClient({
        transport: {
          type: "http",
          url: `${MCP_SERVER_URL}/mcp`,
          headers: {
            ...(MCP_API_KEY ? { Authorization: `Bearer ${MCP_API_KEY}` } : {}),
          },
        },
      });

      tools = await mcpClient.tools();

      // Enriquecimiento Forzado: Si hay cédula, obtenemos los datos oficiales desde el backend
      if (activeClientData?.identification) {
        const enriched = await getClientFromMCP(mcpClient, activeClientData.identification, activeClientData, true);
        if (enriched) {
          activeClientData = enriched;
        }
      }

      conversationHistory = await loadConversationHistory(mcpClient!, sessionId);

      if (loadHistoryOnly) {
        await mcpClient.close();
        return Response.json({
          success: true,
          history: conversationHistory,
          sessionId,
        });
      }

      const lastMessage = getLastUserMessage(messages);
      const lastUserMessageText = lastMessage ? extractTextContent(lastMessage) : "";

      if (activeClientData?.identification) {
        summaryPromise = updateConversationSummary(tools, sessionId, activeClientData, lastUserMessageText).catch(() => {}) as Promise<void>;
      }

      if (activeClientData && conversationHistory.length > 0 && conversationHistory.length % 5 === 0) {
        const historyPromise = updateSummaryFromHistory(tools, sessionId, conversationHistory, activeClientData).catch(() => {}) as Promise<void>;
        summaryPromise = summaryPromise
          ? Promise.all([summaryPromise, historyPromise]).then(() => { })
          : historyPromise;
      }

      if (lastMessage) {
        userSavePromise = saveInteraction({
          tools,
          sessionId,
          role: "user",
          content: lastUserMessageText,
          identification: activeClientData?.identification,
          contract: activeClientData?.contract,
          sector: activeClientData?.sector,
          contactName: activeClientData?.name,
          contactEmail: activeClientData?.email,
          contactPhone: activeClientData?.phone,
        }).catch(() => {}) as Promise<void>;
      }

    } catch (mcpError) {
    }


    const lastMessage = getLastUserMessage(messages);
    const userMessageText = lastMessage ? extractTextContent(lastMessage) : "";


    let toolResults: ToolResult[] = [];
    const hasTools = Object.keys(tools).length > 0;
    let routerRetried: string | undefined;
    let selectedSolverModel = SOLVER_FLASH_MODEL;

    if (hasTools) {
      const routerHistory = buildRouterHistory(conversationHistory, messages);
      const routerResult = await routeRequest(
        userMessageText,
        activeClientData,
        tools,
        sessionId,
        routerHistory.length,
        routerHistory
      );

      if (routerResult.retriedModel) {
      }

      routerRetried = routerResult.retriedModel;
      selectedSolverModel = routerResult.routePolicy.solverModel === "pro" ? SOLVER_PRO_MODEL : SOLVER_FLASH_MODEL;

      toolResults = routerResult.toolResults;

      if (toolResults.length > 0) {
        persistToolResultsInBackground(tools, sessionId, toolResults, activeClientData);
      }

      const noToolResponse = routerResult.noToolNeeded
        ? routerResult.directResponse?.trim() || undefined
        : undefined;

      if (noToolResponse) {

        const saveContent = stripUiControlTokens(noToolResponse);

        if (userSavePromise) await userSavePromise;
        await saveModelAndCleanup({
          tools, sessionId, content: saveContent,
          identification: activeClientData?.identification,
          contract: activeClientData?.contract,
          summaryPromise, mcpClient,
        });

        return createTextStreamResponse(
          noToolResponse,
          routerRetried ? { retried: true, model: routerRetried } : undefined
        );
      }
    }

    const terminalResult = toolResults.find(tr => TERMINAL_TOOLS.has(tr.toolName));
    if (terminalResult) {

      if (terminalResult.toolName === "close_conversation" && tools.search_knowledge_base) {
        try {
          const closeLinksToolCallId = `close-links-${Date.now()}`;
          const closeLinksResult = await tools.search_knowledge_base.execute(
            { query: SISPROT_NETWORKS_QUERY },
            { messages: [], toolCallId: closeLinksToolCallId }
          );
          
          const newToolResult = {
            toolName: "search_knowledge_base",
            toolCallId: closeLinksToolCallId,
            result: closeLinksResult
          };
          
          toolResults.push(newToolResult);

          persistToolResultsInBackground(tools, sessionId, [newToolResult], activeClientData);
        } catch (linksError) {
        }
      }
    }


    const assistantConfig = {
      ...DEFAULT_ASSISTANT_CONFIG,
      ...config,
      ...(selectedSolverModel ? { model: selectedSolverModel } : {}),
    };

    const solverHistory = buildSolverHistory(conversationHistory, messages);

    const solverOptions = {
      config: assistantConfig,
      sessionId,
      conversationHistory: solverHistory,
    };

    const currentSessionId = sessionId;
    const currentClientData = clientData;
    const currentTools = tools;

    const hasToolContext = toolResults.length > 0;
    if (hasToolContext) {
    }

    const result = generateResponse(
      userMessageText,
      activeClientData,
      toolResults,
      solverOptions
    );

    const { response, streamDone, getContentSent } = createResilientStreamResponse({
      originalStream: result.textStream,
      hasToolContext,
      truncationThreshold: TRUNCATION_THRESHOLD,
      emptyFallback: EMPTY_RESPONSE_FALLBACK,
      retriedModel: routerRetried,
      recoverBuffered: async () => {
        const recovery = await generateResponseBuffered(userMessageText, clientData, toolResults, solverOptions);
        return { text: recovery.text || EMPTY_RESPONSE_FALLBACK, model: recovery.model };
      },
    });

    (async () => {
      try {
        await streamDone;

        const contentSent = getContentSent();

        let toSave = stripUiControlTokens(contentSent.trim());
        if (!toSave) {
          toSave = EMPTY_RESPONSE_FALLBACK;
        }

        if (!contentSent.trim()) {
        } else {
          if (hasToolContext && contentSent.trim().length < 100) {
          }
        }

        await saveModelAndCleanup({
          tools: currentTools,
          sessionId: currentSessionId,
          content: toSave,
          identification: activeClientData?.identification,
          contract: activeClientData?.contract,
          summaryPromise, mcpClient,
        });
      } catch (err) {
      }
    })();

    return response;

  } catch (error) {
    if (mcpClient) {
      await mcpClient.close();
    }

    return errorResponse(
      error instanceof Error ? error.message : "Error desconocido",
      500
    );
  }
}
