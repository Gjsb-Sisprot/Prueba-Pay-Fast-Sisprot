
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, stepCountIs } from "ai";
import type { ClientContextData } from "./types";
import type { MCPToolSet } from "./mcp-types";
import { classifyIntent } from "./intent-classifier";
import { buildRouterPrompt } from "./router-prompt";
import { buildNoToolDirectResponse } from "./router-direct-responses";
import {
  classifyNativeRouteDecision,
  getFallbackSolverModel,
  type PreferredSolverModel,
} from "./router-route-classifier";
import {
  type RouterConversationMessage,
  detectContextualEscalationSignal,
  isExplicitCloseRequest,
  isExplicitEscalationRequest,
  isLikelyContextualFollowUp,
  isLikelyFollowUpAcknowledgment,
  hasExplicitContractReference,
} from "./router-intent-guards";
import {
  type ToolCall,
  type ToolResult,
  filterToolsForRouter,
  executeForced,
  executeForcedClose,
  executeForcedEscalation,
  extractStepResults,
  patchMissingResults,
  isHighDemandError,
  FAST_PATH_ELIGIBLE_TOOLS,
  FAST_PATH_EXCLUDED_CATEGORIES,
} from "./router-helpers";

export type { IntentCategory, IntentClassification } from "./intent-classifier";
export type { ToolCall, ToolResult } from "./router-helpers";
export { buildNoToolDirectResponse } from "./router-direct-responses";


const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const ROUTER_PRIMARY_MODEL = process.env.ROUTER_PRIMARY_MODEL?.trim() || "gemini-2.5-flash";
const ROUTER_FALLBACK_MODELS = ["gemini-2.5-flash-lite"] as const;
const MODEL_CHAIN: string[] = [
  ROUTER_PRIMARY_MODEL,
  ...ROUTER_FALLBACK_MODELS.filter((model) => model !== ROUTER_PRIMARY_MODEL),
];
const MAX_TOOL_STEPS = 1;

const ROUTER_TEMPERATURE = 1.0;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed < 1000) return fallback;
  return parsed;
}

const ROUTER_PRIMARY_TIMEOUT_MS = parsePositiveInt(process.env.ROUTER_PRIMARY_TIMEOUT_MS, 24000);
const ROUTER_FALLBACK_TIMEOUT_MS = parsePositiveInt(process.env.ROUTER_FALLBACK_TIMEOUT_MS, 18000);

function getRouterTimeoutMs(attemptIndex: number): number {
  return attemptIndex === 0 ? ROUTER_PRIMARY_TIMEOUT_MS : ROUTER_FALLBACK_TIMEOUT_MS;
}

function buildSupportContractDisambiguationMessage(clientData?: ClientContextData): string {
  const contracts = clientData?.allContracts ?? [];
  const contractsHint = contracts
    .slice(0, 4)
    .map((contract) => `#${contract.contractId}${contract.sector ? ` (${contract.sector})` : ""}`)
    .join(", ");

  if (contractsHint) {
    return `Para ayudarte con soporte o escalamiento necesito saber a cuál contrato te refieres. Tienes estos contratos: ${contractsHint}. Puedes responder con el número de contrato o el sector.`;
  }

  return "Para ayudarte con soporte o escalamiento necesito que me indiques a cuál contrato te refieres, ya que tienes múltiples contratos asociados.";
}

function buildPlansQueryForClientType(clientData: ClientContextData | undefined, fallbackQuery: string): string {
  const normalizedType = clientData?.clientType?.toUpperCase() || "";

  if (normalizedType.includes("PYME") || normalizedType.includes("COMERCIAL") || normalizedType.includes("EMPRESA")) {
    return "planes pymes empresas internet precios velocidades sisprot";
  }

  if (normalizedType.includes("RESIDENCIAL")) {
    return "planes residenciales internet precios velocidades sisprot";
  }

  return fallbackQuery;
}

function shouldKeepToolRouting(intent: ReturnType<typeof classifyIntent>): boolean {
  if (intent.confidence === "baja") return false;

  const categoriesThatNeedTools = new Set([
    "INFO_PLANES",
    "INFO_COBERTURA",
    "INFO_PAGOS",
    "INFO_ADMINISTRATIVO",
    "INFO_INSTALACION",
    "PROBLEMA_TECNICO",
    "ESCALACION",
    "CIERRE_CONFIRMADO",
  ] as const);

  return Boolean(intent.suggestedTool) && categoriesThatNeedTools.has(intent.category as (typeof categoriesThatNeedTools extends Set<infer U> ? U : never));
}

function buildEscalationReason(
  intent: ReturnType<typeof classifyIntent>,
  contextualReason?: string
): string {
  if (contextualReason?.trim()) return contextualReason.trim();
  if (intent.category === "ESCALACION") {
    return "Cliente solicitó atención de un especialista humano.";
  }
  return "Cliente confirmó que desea escalar su solicitud con un especialista.";
}

function buildCloseResolution(message: string): string {
  const compactMessage = message.trim().replace(/\s+/g, " ").slice(0, 160);
  if (!compactMessage) {
    return "Usuario confirmó que no requiere más asistencia.";
  }
  return `Usuario solicitó cerrar la conversación: ${compactMessage}`;
}

function buildRouterInputWithHistory(
  message: string,
  conversationHistory: RouterConversationMessage[] = []
): string {
  const recentTurns = conversationHistory
    .filter((entry) => entry.role !== "tool" && entry.content?.trim())
    .slice(-6)
    .map((entry) => `${entry.role === "model" || entry.role === "assistant" ? "asistente" : "usuario"}: ${entry.content.trim()}`);

  if (recentTurns.length === 0) {
    return message;
  }

  return `Usa el historial solo como contexto para interpretar el mensaje actual.

[HISTORIAL RECIENTE]
${recentTurns.join("\n")}
[/HISTORIAL RECIENTE]

[MENSAJE ACTUAL]
${message}`;
}


export interface RouterResult {
  noToolNeeded: boolean;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  directResponse?: string;
  routePolicy: RoutePolicy;
  durationMs: number;
  retriedModel?: string;
}

export interface RoutePolicy {
  action: "direct_response" | "ask_clarification" | "tool_call" | "solver";
  solverModel?: PreferredSolverModel;
  source: "deterministic" | "native_classifier" | "fallback";
  confidence?: number;
  reason?: string;
}

function buildRoutePolicy(
  action: RoutePolicy["action"],
  source: RoutePolicy["source"],
  options: Partial<Omit<RoutePolicy, "action" | "source">> = {}
): RoutePolicy {
  return {
    action,
    source,
    ...options,
  };
}


export async function routeRequest(
  message: string,
  clientData: ClientContextData | undefined,
  tools: MCPToolSet,
  sessionId?: string,
  conversationLength?: number,
  conversationHistory: RouterConversationMessage[] = []
): Promise<RouterResult & { intentClassification?: ReturnType<typeof classifyIntent> }> {
  const startTime = Date.now();
  const elapsed = () => Date.now() - startTime;

  const intent = classifyIntent(message);

  const fallbackSolverModel = getFallbackSolverModel(intent, clientData, conversationHistory);

  if (!tools || Object.keys(tools).length === 0) {
    return {
      noToolNeeded: true,
      toolCalls: [],
      toolResults: [],
      routePolicy: buildRoutePolicy("solver", "fallback", {
        solverModel: fallbackSolverModel,
        reason: "Sin herramientas disponibles",
      }),
      durationMs: elapsed(),
      intentClassification: intent,
    };
  }

  const contextualEscalation = detectContextualEscalationSignal(message, conversationHistory, clientData);
  const explicitCloseRequest = isExplicitCloseRequest(message);
  
  const allowEscalationTool = true;
  const allowCloseTool = true;

  const routerTools = filterToolsForRouter(tools, {
    allowEscalation: allowEscalationTool,
    allowClose: allowCloseTool,
  });
  
  if (contextualEscalation.shouldEnableEscalation) {
  }

  if (explicitCloseRequest) {
  }

  const isAmbiguousSupportIssue =
    (intent.category === "PROBLEMA_TECNICO" || intent.category === "ESCALACION" || contextualEscalation.shouldEnableEscalation) &&
    (clientData?.totalContracts ?? 0) > 1 &&
    !hasExplicitContractReference(message, clientData);

  if (isAmbiguousSupportIssue) {
    return {
      noToolNeeded: true,
      toolCalls: [],
      toolResults: [],
      directResponse: buildSupportContractDisambiguationMessage(clientData),
      routePolicy: buildRoutePolicy("ask_clarification", "deterministic", {
        reason: "Soporte/escalamiento multi-contrato sin contrato explícito",
      }),
      durationMs: elapsed(),
      intentClassification: intent,
    };
  }

  const shouldForceNoToolForShortAck =
    intent.confidence === "baja" &&
    intent.suggestedTool === null &&
    isLikelyFollowUpAcknowledgment(message) &&
    !contextualEscalation.shouldEnableEscalation &&
    !explicitCloseRequest;

  const shouldForceNoToolForContextualFollowUp =
    intent.confidence === "baja" &&
    intent.suggestedTool === null &&
    isLikelyContextualFollowUp(message, conversationHistory, clientData) &&
    !contextualEscalation.shouldEnableEscalation &&
    !explicitCloseRequest;

  const shortAckDirectResponse = shouldForceNoToolForShortAck
    ? buildNoToolDirectResponse(message, clientData, conversationLength)
    : undefined;

  if (shouldForceNoToolForShortAck || shouldForceNoToolForContextualFollowUp) {
    return {
      noToolNeeded: true,
      toolCalls: [],
      toolResults: [],
      directResponse: shouldForceNoToolForContextualFollowUp ? undefined : shortAckDirectResponse,
      routePolicy: shortAckDirectResponse
        ? buildRoutePolicy("direct_response", "deterministic", {
            reason: "Cortesía corta resuelta sin solver",
          })
        : buildRoutePolicy("solver", "fallback", {
            solverModel: "flash",
            reason: "Seguimiento corto sin necesidad de tools",
          }),
      durationMs: elapsed(),
      intentClassification: intent,
    };
  }

  const shouldForceEscalation =
    Boolean(sessionId) &&
    allowEscalationTool &&
    (intent.category === "ESCALACION" || contextualEscalation.shouldEnableEscalation);

  if (shouldForceEscalation) {
    const escalationReason = buildEscalationReason(intent, contextualEscalation.reason);
    const forcedEscalation = await executeForcedEscalation(routerTools, sessionId!, escalationReason);

    if (forcedEscalation) {
      return {
        noToolNeeded: false,
        toolCalls: [{ toolName: forcedEscalation.toolName, args: { sessionId, reason: escalationReason } }],
        toolResults: [forcedEscalation],
        routePolicy: buildRoutePolicy("tool_call", "deterministic", {
          solverModel: "pro",
          reason: "Escalamiento determinista",
        }),
        durationMs: elapsed(),
        intentClassification: intent,
      };
    }

  }

  const shouldForceClose =
    Boolean(sessionId) &&
    allowCloseTool &&
    (intent.category === "CIERRE_CONFIRMADO" || explicitCloseRequest);

  if (shouldForceClose) {
    const closeResolution = buildCloseResolution(message);
    const forcedClose = await executeForcedClose(routerTools, sessionId!, closeResolution);

    if (forcedClose) {
      return {
        noToolNeeded: false,
        toolCalls: [{ toolName: forcedClose.toolName, args: { sessionId, resolution: closeResolution, closedBy: "user" } }],
        toolResults: [forcedClose],
        routePolicy: buildRoutePolicy("tool_call", "deterministic", {
          solverModel: "pro",
          reason: "Cierre determinista",
        }),
        durationMs: elapsed(),
        intentClassification: intent,
      };
    }

  }

  const shouldForcePlansSearch =
    intent.category === "INFO_PLANES" &&
    intent.confidence === "alta" &&
    intent.suggestedTool === "search_knowledge_base";

  if (shouldForcePlansSearch) {
    const plansQuery = buildPlansQueryForClientType(clientData, intent.suggestedQuery || message);
    const forcedPlans = await executeForced("search_knowledge_base", plansQuery, routerTools);
    if (forcedPlans) {
      return {
        noToolNeeded: false,
        toolCalls: [{ toolName: forcedPlans.toolName, args: { query: plansQuery } }],
        toolResults: [forcedPlans],
        routePolicy: buildRoutePolicy("tool_call", "deterministic", {
          solverModel: "flash",
          reason: "Busqueda de planes forzada y contextualizada por tipo de cliente",
        }),
        durationMs: elapsed(),
        intentClassification: intent,
      };
    }
  }

  if (intent.suggestedTool === null && intent.confidence !== "baja" && !FAST_PATH_EXCLUDED_CATEGORIES.has(intent.category)) {

    const directResponse = buildNoToolDirectResponse(message, clientData, conversationLength);

    if ((intent.category === "CONVERSACIONAL" || intent.category === "CIERRE_CONFIRMADO") && directResponse) {
      return {
        noToolNeeded: true,
        toolCalls: [],
        toolResults: [],
        directResponse,
        routePolicy: buildRoutePolicy("direct_response", "deterministic", {
          reason: `Respuesta directa para ${intent.category}`,
        }),
        durationMs: elapsed(),
        intentClassification: intent,
      };
    }

    return {
      noToolNeeded: true,
      toolCalls: [],
      toolResults: [],
      directResponse: undefined,
      routePolicy: buildRoutePolicy("solver", "fallback", {
        solverModel: fallbackSolverModel,
        reason: `Fast path sin herramienta para ${intent.category}`,
      }),
      durationMs: elapsed(),
      intentClassification: intent,
    };
  }

  const nativeRoute = await classifyNativeRouteDecision({
    message,
    clientData,
    intent,
    conversationHistory,
  });

  if (nativeRoute) {
  }

  const shouldDeferToRegexTool =
    Boolean(nativeRoute) &&
    nativeRoute!.route !== "tool_call" &&
    (shouldKeepToolRouting(intent) || (intent.confidence === "alta" && Boolean(intent.suggestedTool) && nativeRoute!.confidence < 0.9));

  const preferredToolSolverModel = nativeRoute?.answerComplexity ?? fallbackSolverModel;

  if (nativeRoute && !shouldDeferToRegexTool && nativeRoute.route !== "tool_call") {
    return {
      noToolNeeded: true,
      toolCalls: [],
      toolResults: [],
      directResponse: undefined,
      routePolicy: buildRoutePolicy("solver", "native_classifier", {
        solverModel: nativeRoute.answerComplexity,
        confidence: nativeRoute.confidence,
        reason: nativeRoute.reason,
      }),
      durationMs: elapsed(),
      intentClassification: intent,
    };
  }

  if (
    intent.confidence === "alta" &&
    intent.suggestedTool &&
    FAST_PATH_ELIGIBLE_TOOLS.has(intent.suggestedTool) &&
    !FAST_PATH_EXCLUDED_CATEGORIES.has(intent.category)
  ) {
    const forced = await executeForced(intent.suggestedTool, intent.suggestedQuery || message, routerTools);
    if (forced) {
      return {
        noToolNeeded: false,
        toolCalls: [{ toolName: forced.toolName, args: { query: intent.suggestedQuery || message } }],
        toolResults: [forced],
        routePolicy: buildRoutePolicy("tool_call", nativeRoute ? "native_classifier" : "fallback", {
          solverModel: preferredToolSolverModel,
          confidence: nativeRoute?.confidence,
          reason: nativeRoute?.reason || `Tool forzada por regex para ${intent.category}`,
        }),
        durationMs: elapsed(),
        intentClassification: intent,
      };
    }
  }

  if (intent.confidence === "alta" && intent.suggestedTool && FAST_PATH_EXCLUDED_CATEGORIES.has(intent.category)) {
  }

  try {
    const { result, retriedModel } = await callGeminiWithFallback(message, clientData, routerTools, sessionId, conversationHistory);

    const responseText = result.text?.trim() || "";
    const { toolCalls, toolResults } = extractStepResults(result.steps);

    if (toolCalls.some(tc => tc.toolName === "close_conversation") && !explicitCloseRequest && intent.category !== "CIERRE_CONFIRMADO") {
    }
    if (toolCalls.some(tc => tc.toolName === "escalate_to_specialist") && !contextualEscalation.shouldEnableEscalation && !isExplicitEscalationRequest(message) && intent.category !== "ESCALACION") {
    }

    if (
      intent.confidence === "baja" &&
      (isLikelyFollowUpAcknowledgment(message) || isLikelyContextualFollowUp(message, conversationHistory, clientData)) &&
      !contextualEscalation.shouldEnableEscalation &&
      toolCalls.length > 0
    ) {
      return {
        noToolNeeded: true,
        toolCalls: [],
        toolResults: [],
        directResponse: undefined,
        routePolicy: buildRoutePolicy("solver", "fallback", {
          solverModel: "flash",
          reason: "Guardrail de seguimiento ambiguo descarto tool calls",
        }),
        durationMs: elapsed(),
        intentClassification: intent,
        retriedModel,
      };
    }

    const modelSaidNoTool = responseText.includes("NO_TOOL_NEEDED");
    const modelCalledTool = toolCalls.length > 0 || toolResults.length > 0;

    if (!modelCalledTool && (modelSaidNoTool || responseText.length > 0)) {
      const isExcludedCategory = FAST_PATH_EXCLUDED_CATEGORIES.has(intent.category);

      const directResponse = undefined;

      if (intent.confidence === "alta" && intent.suggestedTool) {
        if (intent.suggestedTool === "escalate_to_specialist" && sessionId) {
          const escalationReason = buildEscalationReason(intent, contextualEscalation.reason);
          const forcedEscalation = await executeForcedEscalation(routerTools, sessionId, escalationReason);
          if (forcedEscalation) {
            return {
              noToolNeeded: false,
              toolCalls: [{ toolName: forcedEscalation.toolName, args: { sessionId, reason: escalationReason } }],
              toolResults: [forcedEscalation],
              routePolicy: buildRoutePolicy("tool_call", "deterministic", {
                solverModel: "pro",
                reason: "Override de escalamiento por regex",
              }),
              durationMs: elapsed(),
              intentClassification: intent,
              retriedModel,
            };
          }
        }

        if (intent.suggestedTool === "close_conversation" && sessionId) {
          const closeResolution = buildCloseResolution(message);
          const forcedClose = await executeForcedClose(routerTools, sessionId, closeResolution);
          if (forcedClose) {
            return {
              noToolNeeded: false,
              toolCalls: [{ toolName: forcedClose.toolName, args: { sessionId, resolution: closeResolution, closedBy: "user" } }],
              toolResults: [forcedClose],
              routePolicy: buildRoutePolicy("tool_call", "deterministic", {
                solverModel: "pro",
                reason: "Override de cierre por regex",
              }),
              durationMs: elapsed(),
              intentClassification: intent,
              retriedModel,
            };
          }
        }

        const query = isExcludedCategory ? message : (intent.suggestedQuery || message);
        const forced = await executeForced(intent.suggestedTool, query, routerTools);
        if (forced) {
          return {
            noToolNeeded: false,
            toolCalls: [{ toolName: forced.toolName, args: { query } }],
            toolResults: [forced],
            routePolicy: buildRoutePolicy("tool_call", nativeRoute ? "native_classifier" : "fallback", {
              solverModel: preferredToolSolverModel,
              confidence: nativeRoute?.confidence,
              reason: nativeRoute?.reason || `Override de tool para ${intent.category}`,
            }),
            durationMs: elapsed(),
            intentClassification: intent,
            retriedModel,
          };
        }
      }

      return {
        noToolNeeded: true,
        toolCalls: [],
        toolResults: [],
        directResponse,
        routePolicy: buildRoutePolicy("solver", nativeRoute ? "native_classifier" : "fallback", {
          solverModel: nativeRoute?.answerComplexity ?? fallbackSolverModel,
          confidence: nativeRoute?.confidence,
          reason: nativeRoute?.reason || "Gemini Router no llamó tools",
        }),
        durationMs: elapsed(),
        intentClassification: intent,
        retriedModel,
      };
    }

    patchMissingResults(toolCalls, toolResults);

    return {
      noToolNeeded: toolCalls.length === 0,
      toolCalls,
      toolResults,
      routePolicy: buildRoutePolicy(toolCalls.length === 0 ? "solver" : "tool_call", nativeRoute ? "native_classifier" : "fallback", {
        solverModel: toolCalls.length === 0 ? nativeRoute?.answerComplexity ?? fallbackSolverModel : preferredToolSolverModel,
        confidence: nativeRoute?.confidence,
        reason: nativeRoute?.reason || (toolCalls.length === 0 ? "Gemini Router no requirió tools" : "Gemini Router ejecutó tools"),
      }),
      durationMs: elapsed(),
      intentClassification: intent,
      retriedModel,
    };
  } catch (_error) {
    return buildErrorFallback(message, clientData, tools, intent, elapsed, sessionId, contextualEscalation.reason, explicitCloseRequest);
  }
}


async function callGeminiWithFallback(
  message: string,
  clientData: ClientContextData | undefined,
  routerTools: MCPToolSet,
  sessionId?: string,
  conversationHistory: RouterConversationMessage[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ result: any; retriedModel?: string }> {
  const promptWithHistory = buildRouterInputWithHistory(message, conversationHistory);

  for (let i = 0; i < MODEL_CHAIN.length; i++) {
    const modelName = MODEL_CHAIN[i];
    const isLast = i === MODEL_CHAIN.length - 1;
    const attemptStart = Date.now();
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      const abortController = new AbortController();
      const timeoutMs = getRouterTimeoutMs(i);
      timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

      const result = await generateText({
        model: google(modelName),
        system: buildRouterPrompt(clientData, sessionId),
        prompt: promptWithHistory,
        tools: routerTools,
        stopWhen: stepCountIs(MAX_TOOL_STEPS),
        temperature: ROUTER_TEMPERATURE,
        maxOutputTokens: 512,
        maxRetries: 0,
        abortSignal: abortController.signal,
      });
      clearTimeout(timeoutId);
      return { result, retriedModel: i > 0 ? modelName : undefined };
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      const errorDetail = err instanceof Error ? err.message : String(err);
      const isAbort = errorDetail.includes("abort") || (err instanceof Error && err.name === "AbortError");
      const isNotFound = errorDetail.includes("not found") || errorDetail.includes("404");
      const elapsed = Date.now() - attemptStart;

      if ((isHighDemandError(err) || isAbort || isNotFound) && !isLast) {
        continue;
      }
      throw err;
    }
  }
  throw new Error("Todos los modelos fallaron");
}

async function buildErrorFallback(
  message: string,
  clientData: ClientContextData | undefined,
  tools: MCPToolSet,
  intent: ReturnType<typeof classifyIntent>,
  elapsed: () => number,
  sessionId?: string,
  contextualEscalationReason?: string,
  explicitCloseRequest?: boolean
): Promise<RouterResult & { intentClassification?: ReturnType<typeof classifyIntent> }> {
  if (sessionId && explicitCloseRequest) {
    const closeResolution = buildCloseResolution(message);
    const forcedClose = await executeForcedClose(tools, sessionId, closeResolution);
    if (forcedClose) {
      return {
        noToolNeeded: false,
        toolCalls: [{ toolName: forcedClose.toolName, args: { sessionId, resolution: closeResolution, closedBy: "user" } }],
        toolResults: [forcedClose],
        routePolicy: buildRoutePolicy("tool_call", "deterministic", {
          solverModel: "pro",
          reason: "Fallback por cierre explícito",
        }),
        durationMs: elapsed(),
        intentClassification: intent,
      };
    }
  }

  if (intent.confidence !== "baja" && intent.suggestedTool) {
    if (intent.suggestedTool === "escalate_to_specialist" && sessionId) {
      const escalationReason = buildEscalationReason(intent, contextualEscalationReason);
      const forcedEscalation = await executeForcedEscalation(tools, sessionId, escalationReason);
      if (forcedEscalation) {
        return {
          noToolNeeded: false,
          toolCalls: [{ toolName: forcedEscalation.toolName, args: { sessionId, reason: escalationReason } }],
          toolResults: [forcedEscalation],
          routePolicy: buildRoutePolicy("tool_call", "deterministic", {
            solverModel: "pro",
            reason: "Fallback por escalamiento",
          }),
          durationMs: elapsed(),
          intentClassification: intent,
        };
      }
    }

    if (intent.suggestedTool === "close_conversation" && sessionId) {
      const closeResolution = buildCloseResolution(message);
      const forcedClose = await executeForcedClose(tools, sessionId, closeResolution);
      if (forcedClose) {
        return {
          noToolNeeded: false,
          toolCalls: [{ toolName: forcedClose.toolName, args: { sessionId, resolution: closeResolution, closedBy: "user" } }],
          toolResults: [forcedClose],
          routePolicy: buildRoutePolicy("tool_call", "deterministic", {
            solverModel: "pro",
            reason: "Fallback por cierre",
          }),
          durationMs: elapsed(),
          intentClassification: intent,
        };
      }
    }

    const forced = await executeForced(intent.suggestedTool, intent.suggestedQuery || message, tools);
    if (forced) {
      return {
        noToolNeeded: false,
        toolCalls: [{ toolName: forced.toolName, args: { query: intent.suggestedQuery || message } }],
        toolResults: [forced],
        routePolicy: buildRoutePolicy("tool_call", "fallback", {
          solverModel: getFallbackSolverModel(intent, clientData, [], 1),
          reason: "Fallback con pre-clasificación regex",
        }),
        durationMs: elapsed(),
        intentClassification: intent,
      };
    }
  }

  return {
    noToolNeeded: true,
    toolCalls: [],
    toolResults: [],
    directResponse: undefined,
    routePolicy: buildRoutePolicy("solver", "fallback", {
      solverModel: getFallbackSolverModel(intent, clientData),
      reason: "Fallback general del router",
    }),
    durationMs: elapsed(),
    intentClassification: intent,
  };
}
