export const dynamic = 'force-dynamic';
import { after } from 'next/server';

import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { DEFAULT_ASSISTANT_CONFIG, CLOSE_OFFER_PREFIX, PAYMENT_ACTION_PREFIX } from "@/modules/assistant/lib/types";
import {
  loadConversationHistory,
  saveInteraction,
  updateConversationSummary,
  updateSummaryFromHistory,
  updateConversationStatus,
} from "@/modules/assistant/lib/persistence";

import {
  type ChatRequestBody,
  extractTextContent,
  getLastUserMessage,
} from "@/modules/assistant/lib/message-processor";

import { routeRequest, type ToolResult } from "@/modules/assistant/lib/router-agent";
import { generateResponse, generateResponseBuffered } from "@/modules/assistant/lib/solver-agent";
import { fetchClientContracts } from "@/modules/assistant/lib/sisprot-api";
import type { ClientContextData } from "@/modules/assistant/lib/types";
import type { ConversationMessage, MCPToolSet } from "@/modules/assistant/lib/mcp-types";

import {
  errorResponse,
  createTextStreamResponse,
  createResilientStreamResponse,
} from "./helpers";
import {
  SISPROT_NETWORKS_QUERY,
} from "@/modules/assistant/lib/channel-links";
import { getLocalTools } from "@/modules/assistant/lib/tools";


const MCP_SERVER_URL = (process.env.MCP_SERVER_URL || "https://mcp-humo-prueba-sisprot.vercel.app").replace(/\/+$/, "");
const MCP_API_KEY = process.env.MCP_API_KEY || "";
const TERMINAL_TOOLS = new Set(["escalate_to_specialist", "close_conversation"]);
const TRUNCATION_THRESHOLD = 150;
const EMPTY_RESPONSE_FALLBACK = "Disculpa, tuve un inconveniente procesando tu mensaje. ¿Podrías repetir tu pregunta?";
const SOLVER_FLASH_MODEL = process.env.SOLVER_FLASH_MODEL?.trim() || "gemini-1.5-flash";
const SOLVER_PRO_MODEL = process.env.SOLVER_PRO_MODEL?.trim() || process.env.SOLVER_PRIMARY_MODEL?.trim() || "gemini-1.5-pro";


export const maxDuration = 300;

const PAYMENT_ACTION_TOKEN_REGEX = /(?:__PAYMENT_ACTION__|PAYMENT_ACTION)\s*:?/gi;
const CLOSE_CHAT_TOKEN_REGEX = /__CLOSE_CHAT__/gi;
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
    .replace(CLOSE_CHAT_TOKEN_REGEX, "")
    .replace(TECHNICAL_TOKEN_REGEX, "")
    .trim();
}

function buildSolverHistory(
  conversationHistory: ConversationMessage[],
  frontendMessages: ChatRequestBody["messages"]
) {
  // Priorizar el historial de la base de datos si está disponible, 
  // ya que es la "fuente de verdad" persistida.
  if (conversationHistory.length > 0) {
    return conversationHistory
      .filter(msg => msg.role !== "tool" && msg.role !== "system")
      .map(msg => ({
        role: msg.role === "model" ? "assistant" as const : "user" as const,
        content: msg.content,
      }));
  }

  // Si no hay historial en BD (conversación nueva), usar los mensajes del frontend
  if (frontendMessages && frontendMessages.length > 1) {
    const historySlice = frontendMessages.slice(0, -1);
    return historySlice
      .filter(msg => msg.role === "user" || msg.role === "assistant")
      .map(msg => ({
        role: msg.role === "assistant" ? "assistant" as const : "user" as const,
        content: extractTextContent(msg),
      }));
  }

  return [];
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
  sessionId: string,
  toolResults: ToolResult[],
  clientData?: ChatRequestBody["clientData"]
) {
  for (const tr of toolResults) {
    const resultStr = typeof tr.result === "string" ? tr.result : JSON.stringify(tr.result);

    saveInteraction({
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
  let sessionId: string | undefined;
  let activeClientData: ClientContextData | undefined;

  try {
    const body = (await request.json()) as ChatRequestBody;
    const { messages, config, loadHistoryOnly, clientData } = body;
    sessionId = body.sessionId;
    activeClientData = clientData;

    if (!messages || !Array.isArray(messages)) {
      return errorResponse("Mensajes requeridos", 400);
    }

    if (!sessionId) {
      return errorResponse("sessionId requerido", 400);
    }

    const verifiedSessionId = sessionId;


    const lastMessage = getLastUserMessage(messages);
    const userMessageText = lastMessage ? extractTextContent(lastMessage) : "";

    let tools: MCPToolSet = {};
    let conversationHistory: ConversationMessage[] = [];
    let summaryPromise: Promise<void> | null = null;

    try {

      conversationHistory = await loadConversationHistory(sessionId);

      if (loadHistoryOnly) {
        return Response.json({
          success: true,
          history: conversationHistory,
          sessionId,
        });
      }

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

        // Timeout de 8 segundos para obtener las herramientas y no bloquear el request
        const toolsPromise = mcpClient.tools();
        const timeoutPromise = new Promise<MCPToolSet>((_, reject) => 
          setTimeout(() => reject(new Error("Timeout inicializando herramientas MCP")), 8000)
        );
        
        tools = await Promise.race([toolsPromise, timeoutPromise]).catch(err => {
          console.warn("[MCP_WARNING] Fallo al cargar herramientas:", err.message);
          return {} as MCPToolSet;
        });

        // Combinar con herramientas locales (PRIORIDAD LOCAL)
        const localTools = getLocalTools();
        tools = { ...tools, ...localTools };

      } catch (err) {
        console.warn("[MCP_CRITICAL] No se pudo conectar con el servidor MCP:", err instanceof Error ? err.message : String(err));
        // Si falla el MCP, al menos cargamos las herramientas locales
        tools = getLocalTools();
      }

      if (activeClientData && conversationHistory.length > 0 && conversationHistory.length % 5 === 0) {
        const historyPromise = updateSummaryFromHistory(sessionId, conversationHistory, activeClientData).catch(() => {}) as Promise<void>;
        summaryPromise = summaryPromise
          ? Promise.all([summaryPromise, historyPromise]).then(() => { })
          : historyPromise;
      }
    } catch {
      // Ignoramos fallos del MCP para el flujo principal
    }

    // Enriquecimiento Fuera de bloque MCP: Vital para que funcione aunque el server MCP no esté disponible
    if (activeClientData?.identification) {
      try {
        console.log(`[SISPROT_ENRICH] Buscando contratos para ID: ${activeClientData.identification}`);
        const sisprotClient = await fetchClientContracts(activeClientData.identification).catch(() => null);
        if (sisprotClient) {
          console.log(`[SISPROT_ENRICH] ¡Éxito! Encontrados ${sisprotClient.contracts.length} contratos.`);
          activeClientData = {
            ...activeClientData,
            totalContracts: sisprotClient.contracts.length,
            allContracts: sisprotClient.contracts.map(c => ({
              contractId: c.contractId,
              status: c.status,
              hasDebt: parseFloat(c.debt) > 0,
              debt: parseFloat(c.debt),
              sector: c.sector,
              planName: c.planName,
              onuSerial: c.onuSerial,
              isActive: c.isActive
            })),
            debugQuery: sisprotClient.debugUrl,
            identification: activeClientData.identification.trim().toUpperCase().startsWith('V') 
              ? activeClientData.identification.trim().toUpperCase().slice(1) 
              : activeClientData.identification.trim().toUpperCase(),
            // AUTO-ENRIQUECIMIENTO DE NOMBRE: Si no tenemos nombre, usamos el de la API de Sisprot
            name: activeClientData.name || sisprotClient.contracts[0]?.clientName || null
          } as ClientContextData;
        } else {
          console.log(`[SISPROT_ENRICH] No se obtuvieron resultados de la API.`);
        }
      } catch (err) {
        console.log(`[SISPROT_ENRICH] Error en consulta:`, err);
        // Fallback al dato original si falla la API
      }
    }

    // Persistencia del mensaje del usuario (BLOQUEANTE para asegurar registro en Vercel)
    if (lastMessage) {
      await saveInteraction({
        sessionId,
        role: "user",
        content: userMessageText,
        attachments: lastMessage.attachments,
        identification: activeClientData?.identification,
        contract: activeClientData?.contract,
        sector: activeClientData?.sector,
        contactName: activeClientData?.name,
        contactEmail: activeClientData?.email,
        contactPhone: activeClientData?.phone,
      }).catch((err) => console.error("[SUPABASE_USER_SAVE_ERROR]", err));
      
      if (activeClientData?.identification) {
        await updateConversationSummary(sessionId, activeClientData, userMessageText).catch(() => {});
      }
    }

    // Helper para extraer Ticket ID (mantenemos lógica consistente con el endpoint de cierre)
    const getTicketIdFromResult = (raw: unknown): number | null => {
      try {
        const tr = raw as { content?: Array<{ type: string; text?: string }> };
        const text = tr?.content?.find((c) => c.type === "text")?.text;
        if (!text) return null;
        const parsed = JSON.parse(text) as { 
          glpiTicketId?: number; 
          glpi_ticket_id?: number; 
          ticket?: { ticketId: number };
          message?: string;
        };
        const id = parsed.glpiTicketId ?? parsed.glpi_ticket_id ?? parsed.ticket?.ticketId;
        if (id) return Number(id);
        const m = String(parsed.message || "").match(/#(\d+)/);
        return m ? Number(m[1]) : null;
      } catch { return null; }
    };


    // Truncamos historial para el Router (máximo 4 mensajes previos)
    const truncatedRouterHistory = conversationHistory.slice(-4);
    const routerHistory = buildRouterHistory(truncatedRouterHistory, messages);
    const routerResult = await routeRequest(
      userMessageText,
      activeClientData,
      tools,
      sessionId,
      routerHistory.length,
      routerHistory
    );

    console.log(`[CHAT_ROUTE] Router Action: ${routerResult.routePolicy.action}, NoTool: ${routerResult.noToolNeeded}, DirectResp: ${!!routerResult.directResponse}, Tools: ${Object.keys(tools).length}`);

    const routerRetried = routerResult.retriedModel;
    const selectedSolverModel = routerResult.routePolicy.solverModel === "pro" ? SOLVER_PRO_MODEL : SOLVER_FLASH_MODEL;
    const toolResults = routerResult.toolResults;

    if (toolResults.length > 0) {
      console.log(`[CHAT_ROUTE] Executing ${toolResults.length} tools`);
      persistToolResultsInBackground(sessionId, toolResults, activeClientData);
    }

    const noToolResponse = routerResult.noToolNeeded
      ? routerResult.directResponse?.trim() || undefined
      : undefined;

    if (noToolResponse) {
      console.log(`[CHAT_ROUTE] Intercepted Direct Response: ${noToolResponse.substring(0, 50)}...`);

      const saveContent = stripUiControlTokens(noToolResponse);

      // Guardado bloqueante para respuestas directas
      await saveInteraction({
        sessionId,
        role: "model",
        content: saveContent,
        identification: activeClientData?.identification,
        contract: activeClientData?.contract,
      }).catch((err) => console.error("[SUPABASE_DIRECT_SAVE_ERROR]", err));

      if (summaryPromise) await summaryPromise;
      if (mcpClient) await mcpClient.close();

      return createTextStreamResponse(
        noToolResponse,
        routerRetried ? { retried: true, model: routerRetried } : undefined
      );
    }

    const terminalResult = toolResults.find(tr => TERMINAL_TOOLS.has(tr.toolName));
    let escalationMarker = "";

    if (terminalResult) {
      if (terminalResult.toolName === "escalate_to_specialist") {
        const ticketId = getTicketIdFromResult(terminalResult.result);
        escalationMarker = ` __CLOSE_CHAT__${ticketId ? ` [TICKET_ID:${ticketId}]` : ""}`;
        
        // Actualización de estado EXPLÍCITA y asíncrona
        updateConversationStatus(sessionId, "waiting_specialist").catch(() => {});
      }

      if (terminalResult.toolName === "close_conversation" && tools.search_knowledge_base) {
        // Actualización de estado EXPLÍCITA y asíncrona
        updateConversationStatus(sessionId, "closed").catch(() => {});
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

          persistToolResultsInBackground(sessionId, [newToolResult], activeClientData);
        } catch {
        }
      }
    }


    const assistantConfig = {
      ...DEFAULT_ASSISTANT_CONFIG,
      ...config,
      // Si el router sugiere un modelo, lo usamos. Si no, DEFAULT_ASSISTANT_CONFIG tiene gemini-1.5-flash
      ...(selectedSolverModel ? { model: selectedSolverModel } : {}),
    };

    // Truncamos historial para el Solver (máximo 4 mensajes previos)
    const truncatedSolverHistory = conversationHistory.slice(-4);
    const solverHistory = buildSolverHistory(truncatedSolverHistory, messages);

    const solverOptions = {
      config: assistantConfig,
      sessionId,
      conversationHistory: solverHistory,
    };

    const hasToolContext = toolResults.length > 0;

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
      suffix: escalationMarker,
      recoverBuffered: async () => {
        try {
          const recovery = await generateResponseBuffered(userMessageText, activeClientData, toolResults, solverOptions);
          return { text: (recovery.text || EMPTY_RESPONSE_FALLBACK) + escalationMarker, model: recovery.model };
        } catch (recoveryErr) {
          console.error(`[SOLVER_RECOVERY_CRITICAL] Fallo en recuperación con modelo ${assistantConfig.model}:`, recoveryErr);
          return { text: EMPTY_RESPONSE_FALLBACK + escalationMarker };
        }
      },
    });

    // Usamos after() de Next.js 15 para garantizar que la persistencia ocurra
    // INCLUSO después de que la respuesta se haya enviado al cliente.
    after(async () => {
      try {
        await streamDone;
        const contentSent = getContentSent();
        const toSave = stripUiControlTokens(contentSent.trim()) || EMPTY_RESPONSE_FALLBACK;

        await saveInteraction({
          sessionId: verifiedSessionId,
          role: "model",
          content: toSave,
          identification: activeClientData?.identification,
          contract: activeClientData?.contract,
          sector: activeClientData?.sector,
          contactName: activeClientData?.name,
        });

        if (summaryPromise) await summaryPromise;
        if (mcpClient) await mcpClient.close();
      } catch (err) {
        console.error("[AFTER_REQUEST_PERSISTENCE_ERROR]", err);
      }
    });

    return response;

  } catch (error) {
    if (mcpClient) {
      await mcpClient.close();
    }

    const errorMsg = error instanceof Error ? error.message : "Error desconocido";
    console.error(`[CHAT_CRITICAL_ERROR] Session: ${sessionId}`, {
      message: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
      client: activeClientData?.identification
    });

    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'X-Error-Detail': errorMsg.substring(0, 100)
      }
    });
  }
}
