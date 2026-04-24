import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, stepCountIs } from "ai";
import type { ClientContextData } from "./types";

import { classifyIntent } from "./intent-classifier";
import { buildRouterPrompt } from "./router-prompt";
import { buildNoToolDirectResponse, buildSupportContractDisambiguationMessage, buildSectorConflictMessage } from "./router-direct-responses";
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
  type LocalToolSet,
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

const ROUTER_PRIMARY_MODEL = process.env.ROUTER_PRIMARY_MODEL?.trim() || "gemini-1.5-flash";
const ROUTER_FALLBACK_MODELS = ["gemini-1.5-flash-8b"] as const;
const MODEL_CHAIN: string[] = [
  ROUTER_PRIMARY_MODEL,
  ...ROUTER_FALLBACK_MODELS.filter((model) => model !== ROUTER_PRIMARY_MODEL),
];
const MAX_TOOL_STEPS = 1;

const ROUTER_TEMPERATURE = 0.0;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed < 1000) return fallback;
  return parsed;
}

const ROUTER_PRIMARY_TIMEOUT_MS = parsePositiveInt(process.env.ROUTER_PRIMARY_TIMEOUT_MS, 10000);
const ROUTER_FALLBACK_TIMEOUT_MS = parsePositiveInt(process.env.ROUTER_FALLBACK_TIMEOUT_MS, 7000);

function getRouterTimeoutMs(attemptIndex: number): number {
  return attemptIndex === 0 ? ROUTER_PRIMARY_TIMEOUT_MS : ROUTER_FALLBACK_TIMEOUT_MS;
}

function buildPlansQueryForClientUsage(clientData: ClientContextData | undefined, message: string): string {
  const normalizedType = clientData?.clientType?.toUpperCase() || "";
  const msgLower = message.toLowerCase();
  
  let baseQuery = "planes de internet precios velocidades sisprot";
  
  if (normalizedType.includes("PYME") || normalizedType.includes("COMERCIAL") || normalizedType.includes("EMPRESA")) {
    baseQuery = "planes pymes empresas internet precios velocidades sisprot";
  } else if (normalizedType.includes("RESIDENCIAL")) {
    baseQuery = "planes residenciales internet precios velocidades sisprot";
  }

  // Enriquecer según el uso detectado
  if (msgLower.includes("gamer") || msgLower.includes("jugar") || msgLower.includes("ps5") || msgLower.includes("xbox")) {
    baseQuery += " gamer juegos latencia";
  } else if (msgLower.includes("streaming") || msgLower.includes("netflix") || msgLower.includes("4k") || msgLower.includes("televisores")) {
    baseQuery += " streaming peliculas tv";
  } else if (msgLower.includes("trabajar") || msgLower.includes("zoom") || msgLower.includes("oficina") || msgLower.includes("home office")) {
    baseQuery += " trabajo oficina zoom simetria";
  }

  return baseQuery;
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
    .slice(-15)
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
  tools: LocalToolSet,
  sessionId?: string,
  conversationLength?: number,
  conversationHistory: RouterConversationMessage[] = []
): Promise<RouterResult & { intentClassification?: ReturnType<typeof classifyIntent> }> {
  const startTime = Date.now();
  const elapsed = () => Date.now() - startTime;

  const contextualEscalation = detectContextualEscalationSignal(message, conversationHistory, clientData);
  
  // PRIORIDAD MÁXIMA: Si estamos confirmando un detalle para escalamiento, FORZAR LA HERRAMIENTA AHORA.
  if (contextualEscalation.shouldEnableEscalation && sessionId) {
    const intent = classifyIntent(message);
    const routerTools = filterToolsForRouter(tools, { allowEscalation: true, allowClose: true });
    
    // Si la razón indica una gestión administrativa (sin visita técnica), usamos create_glpi_ticket
    const isAdministrative = 
       contextualEscalation.reason?.toLowerCase().match(/reactivaci|reembolso|devoluci|reclamo|facturaci|pago|cobro|titular|mudanza|cambio\s+de\s+plan/) || 
       intent.category === "INFO_ADMINISTRATIVO" ||
       clientData?.serviceStatus === "cancelled";
                            
    const escalationReason = buildEscalationReason(intent, contextualEscalation.reason);
    
    console.log(`[ROUTER_DECISION] EJECUCIÓN FORZADA CONTEXTUAL (${isAdministrative ? 'ADMIN' : 'TECH'}): ${escalationReason}`);
    
    const forcedResult = isAdministrative
      ? await executeForced("create_glpi_ticket", { name: "Gestion Administrativa/Ventas", content: escalationReason }, routerTools)
      : await executeForcedEscalation(routerTools, sessionId, escalationReason);
    
    if (forcedResult) {
      return {
        noToolNeeded: false,
        toolCalls: [{ toolName: forcedResult.toolName, args: isAdministrative ? { name: "Gestión Administrativa", content: escalationReason } : { sessionId, reason: escalationReason } }],
        toolResults: [forcedResult],
        routePolicy: buildRoutePolicy("tool_call", "deterministic", {
          solverModel: "pro",
          reason: `Forzado por señal contextual: ${contextualEscalation.source}`,
        }),
        durationMs: elapsed(),
        intentClassification: intent,
      };
    }
  }

  const intent = classifyIntent(message);

  // 🚨 DETECCIÓN DE CONFLICTO DE SECTOR (Módulo seleccionado vs Intención real)
  if (clientData?.sector && intent.confidence !== "baja") {
    const selectedSector = clientData.sector;
    const isTechModule = selectedSector === "Soporte Técnico";
    const isAdminModule = selectedSector === "Gestión Administrativa";

    const isTechIntent = intent.category === "PROBLEMA_TECNICO";
    const isAdminIntent = intent.category === "INFO_ADMINISTRATIVO" || intent.category === "INFO_PAGOS";

    if ((isTechModule && isAdminIntent) || (isAdminModule && isTechIntent)) {
      console.log(`[ROUTER_CONFLICT] Sector ${selectedSector} vs Intención ${intent.category}. Interceptando.`);
      
      const conflictMsg = buildSectorConflictMessage(selectedSector);
      
      return {
        noToolNeeded: true,
        toolCalls: [],
        toolResults: [],
        directResponse: conflictMsg,
        routePolicy: buildRoutePolicy("direct_response", "deterministic", { 
          reason: "Conflicto de sector detectado" 
        }),
        durationMs: elapsed(),
        intentClassification: intent,
      };
    }
  }

  
  // 📈 DETECCIÓN DE FORMULARIO DE CAMBIO DE PLAN (FAST PATH)
  const isBudgetRequest = message.match(/Deseo calcular el presupuesto para un UPGRADE/i);
  const isExecutionRequest = message.match(/Deseo solicitar un DOWNGRADE|__PLAN_CHANGE_CONFIRMED__/i);

  if (isBudgetRequest || isExecutionRequest) {
    const planIdMatch = message.match(/ID (\d+)/i);
    const planId = planIdMatch ? planIdMatch[1] : null;

    if (!planId) {
      console.warn("[ROUTER_FAST_PATH] Petición de cambio de plan detectada pero sin ID.");
    } else if (!clientData?.contract) {
      console.warn("[ROUTER_FAST_PATH] Petición de cambio de plan detectada pero sin contrato en clientData.");
    } else {
      const gsoftId = clientData.contract;
      const routerTools = filterToolsForRouter(tools, { allowEscalation: false });

      if (isBudgetRequest) {
        console.log(`[ROUTER_FAST_PATH] Ejecutando presupuesto para plan: ${planId}`);
        const budgetResult = await executeForced("get_plan_change_budget", { 
          contractId: String(gsoftId), 
          newPlanId: String(planId) 
        }, routerTools);

        if (budgetResult) {
          return {
            noToolNeeded: false,
            toolCalls: [{ toolName: "get_plan_change_budget", args: { contractId: String(gsoftId), newPlanId: String(planId) } }],
            toolResults: [budgetResult],
            routePolicy: buildRoutePolicy("tool_call", "deterministic", { solverModel: "pro", reason: "Budget calculation fast-path" }),
            durationMs: elapsed(),
            intentClassification: intent,
          };
        }
      } else {
        const type = message.includes("DOWNGRADE") ? "DOWNGRADE" : "UPGRADE";
        console.log(`[ROUTER_FAST_PATH] Ejecutando ${type} para plan: ${planId}`);
        
        const requestResult = await executeForced("request_plan_change", {
          contractGsoftId: Number(gsoftId),
          changeType: type,
          newPlan: Number(planId),
          notes: `Solicitado via Chat Susana - ${type}`
        }, routerTools);

        if (requestResult) {
          return {
            noToolNeeded: false,
            toolCalls: [{ toolName: "request_plan_change", args: { contractGsoftId: Number(gsoftId), changeType: type, newPlan: Number(planId) } }],
            toolResults: [requestResult],
            routePolicy: buildRoutePolicy("tool_call", "deterministic", { solverModel: "pro", reason: "Plan change execution fast-path" }),
            durationMs: elapsed(),
            intentClassification: intent,
          };
        }
      }
    }
  }

  // 💸 DETECCIÓN DE FORMULARIO DE REEMBOLSO (FAST PATH)
  if (message.includes("Monto:") && message.includes("Fecha:") && message.includes("Ref:") && message.includes("Banco:")) {
    const lines = message.split("\n");
    const monto = lines.find(l => l.includes("Monto:"))?.split(":")[1]?.trim();
    const fecha = lines.find(l => l.includes("Fecha:"))?.split(":")[1]?.trim();
    const ref = lines.find(l => l.includes("Ref:"))?.split(":")[1]?.trim();
    const banco = lines.find(l => l.includes("Banco:"))?.split(":")[1]?.trim();
    const motivo = lines.find(l => l.includes("Motivo:"))?.split(":")[1]?.trim();

    if (monto && fecha && ref && banco) {
      console.log(`[ROUTER_DECISION] Formulario de reembolso detectado. Ejecutando create_auth_pdf.`);
      const forcedRefund = await executeForced("create_auth_pdf", { 
        amount: monto, 
        date: fecha, 
        reference: ref, 
        bank: banco, 
        reason: motivo || "No especificado",
        contractId: clientData?.contract || "unknown"
      }, tools);
      
      if (forcedRefund) {
        return {
          noToolNeeded: false,
          toolCalls: [{ toolName: "create_auth_pdf", args: { amount: monto, date: fecha, reference: ref, bank: banco, reason: motivo || "No especificado", contractId: clientData?.contract || "unknown" } }],
          toolResults: [forcedRefund],
          routePolicy: buildRoutePolicy("tool_call", "deterministic", {
            solverModel: "pro",
            reason: "Procesamiento automático de formulario de reembolso",
          }),
          durationMs: elapsed(),
          intentClassification: { 
            category: "INFO_ADMINISTRATIVO", 
            confidence: "alta", 
            suggestedTool: "create_auth_pdf", 
            suggestedQuery: null, 
            reasoning: "Detección determinista de campos de formulario de reembolso" 
          },
        };
      }
    }
  }

  // 📝 DETECCIÓN DE FORMULARIO DE CANCELACIÓN (Fase A -> B)
  if (message.includes("Solicitud de Cancelación:")) {
    const motivo = message.split("Motivo:")[1]?.split("\n")[0]?.trim();
    const detalle = message.split("Detalle:")[1]?.split("\n")[0]?.trim();
    
    console.log(`[ROUTER_DECISION] Formulario de cancelación detectado. Generando PDF Fase B.`);
    const forcedPdf = await executeForced("create_auth_pdf", { 
      amount: "0.00", // No aplica para cancelación pero el esquema lo pide
      date: new Date().toLocaleDateString(), 
      reference: clientData?.contract || "0000", 
      bank: "N/A", 
      reason: `Cancelación: ${motivo} - ${detalle}`,
      contractId: clientData?.contract || "unknown"
    }, tools);
    
    if (forcedPdf) {
      return {
        noToolNeeded: false,
        toolCalls: [{ toolName: "create_auth_pdf", args: { amount: "0", date: new Date().toLocaleDateString(), reference: clientData?.contract || "0000", bank: "N/A", reason: `Cancelación: ${motivo}`, contractId: clientData?.contract || "unknown" } }],
        toolResults: [forcedPdf],
        routePolicy: buildRoutePolicy("tool_call", "deterministic", { solverModel: "pro", reason: "Procesamiento Fase A Cancelación -> Fase B PDF" }),
        durationMs: elapsed(),
        intentClassification: { category: "INFO_ADMINISTRATIVO", confidence: "alta", suggestedTool: "create_auth_pdf", suggestedQuery: null, reasoning: "Fase A Cancelación -> Fase B" },
      };
    }
  }

  // 🔄 DETECCIÓN DE FORMULARIO DE REACTIVACIÓN (Fase A -> B)
  if (message.includes("Solicitud de Reactivación:")) {
    const plan = message.split("Plan:")[1]?.split("\n")[0]?.trim();
    const ciclo = message.split("Ciclo:")[1]?.split("\n")[0]?.trim() || "No especificado";
    
    console.log(`[ROUTER_DECISION] Formulario de reactivación detectado. Generando PDF Fase B.`);
    const forcedPdf = await executeForced("create_auth_pdf", { 
      amount: "Variables", // Deuda + Mensualidad
      date: new Date().toLocaleDateString(), 
      reference: clientData?.contract || "0000", 
      bank: "Pendiente", 
      reason: `Reactivación a Plan: ${plan} | Ciclo: ${ciclo}`,
      contractId: clientData?.contract || "unknown"
    }, tools);
    
    if (forcedPdf) {
      return {
        noToolNeeded: false,
        toolCalls: [{ toolName: "create_auth_pdf", args: { amount: "Variables", date: new Date().toLocaleDateString(), reference: clientData?.contract || "0000", bank: "Pendiente", reason: `Reactivación: ${plan}`, contractId: clientData?.contract || "unknown" } }],
        toolResults: [forcedPdf],
        routePolicy: buildRoutePolicy("tool_call", "deterministic", { solverModel: "pro", reason: "Procesamiento Fase A Reactivación -> Fase B PDF" }),
        durationMs: elapsed(),
        intentClassification: { category: "INFO_ADMINISTRATIVO", confidence: "alta", suggestedTool: "create_auth_pdf", suggestedQuery: null, reasoning: "Fase A Reactivación -> Fase B" },
      };
    }
  }

  // 📈 DETECCIÓN DE FORMULARIO DE CAMBIO DE PLAN (Upgrade/Downgrade)
  if (message.includes("Solicitud de Cambio de Plan:")) {
    const type = message.split("Tipo:")[1]?.split("\n")[0]?.trim();
    const planNuevo = message.split("Plan Nuevo:")[1]?.split("\n")[0]?.trim();
    
    console.log(`[ROUTER_DECISION] Formulario de cambio de plan detectado (${type}). Creando ticket GLPI.`);
    
    const ticket = await executeForced("create_glpi_ticket", { 
      name: `Cambio de Plan: ${type} - ${planNuevo}`, 
      content: `Solicitud de gestión administrativa para el contrato #${clientData?.contract}.\n- Tipo: ${type}\n- Plan Destino: ${planNuevo}\n- Estatus Solvencia: Confirmado por usuario`, 
      categoryId: 22 
    }, tools);
    
    if (ticket) {
      return {
        noToolNeeded: false,
        toolCalls: [
          { toolName: "create_glpi_ticket", args: { name: `Cambio de Plan: ${type}`, content: "..." } }
        ],
        toolResults: [ticket],
        routePolicy: buildRoutePolicy("tool_call", "deterministic", { 
          solverModel: "pro", 
          reason: `Procesamiento automático de ${type} de plan` 
        }),
        durationMs: elapsed(),
        intentClassification: { 
          category: "INFO_ADMINISTRATIVO", 
          confidence: "alta", 
          suggestedTool: "create_glpi_ticket", 
          suggestedQuery: null, 
          reasoning: "Detección determinista de formulario de cambio de plan" 
        },
      };
    }
  }

  // ✅ DETECCIÓN DE DOCUMENTO FIRMADO (Fase B -> C)
  if (message.includes("He enviado el documento de autorización firmado.")) {
    const isCancellation = conversationHistory.some(m => m.content.toString().toLowerCase().includes("cancelación") || m.content.toString().toLowerCase().includes("baja"));
    const isReactivation = conversationHistory.some(m => m.content.toString().toLowerCase().includes("reactivación") || m.content.toString().toLowerCase().includes("reingreso"));

    if (isCancellation) {
      console.log(`[ROUTER_DECISION] Documento firmado para cancelación. Ejecutando Fase C.`);
      const ticket = await executeForced("create_glpi_ticket", { name: "Cancelación de Servicio", content: `Solicitud formal de cancelación procesada para el contrato #${clientData?.contract}`, categoryId: 22 }, tools);
      const terminate = await executeForced("terminate_service", { contractId: clientData?.contract || "unknown", reason: "Solicitud del cliente con documento firmado" }, tools);
      
      return {
        noToolNeeded: false,
        toolCalls: [
          { toolName: "create_glpi_ticket", args: { name: "Cancelación", content: "..." } },
          { toolName: "terminate_service", args: { contractId: clientData?.contract } }
        ],
        toolResults: [ticket!, terminate!],
        routePolicy: buildRoutePolicy("tool_call", "deterministic", { solverModel: "pro", reason: "Fase C Cancelación: Ticket + Cierre Técnico" }),
        durationMs: elapsed(),
      };
    }

    if (isReactivation) {
      console.log(`[ROUTER_DECISION] Documento firmado para reactivación. Ejecutando Fase C.`);
      const ticket = await executeForced("create_glpi_ticket", { name: "Reactivación de Servicio", content: `Solicitud formal de reactivación procesada para el contrato #${clientData?.contract}`, categoryId: 22 }, tools);
      const activate = await executeForced("activate_service", { contractId: clientData?.contract || "unknown", planName: clientData?.planName || "Plan Residencial" }, tools);
      const visit = await executeForced("schedule_tech_visit", { contractId: clientData?.contract || "unknown", visitType: "Validación de Reactivación" }, tools);
      
      return {
        noToolNeeded: false,
        toolCalls: [
          { toolName: "create_glpi_ticket", args: { name: "Reactivación", content: "..." } },
          { toolName: "activate_service", args: { contractId: clientData?.contract, planName: "..." } },
          { toolName: "schedule_tech_visit", args: { contractId: clientData?.contract, visitType: "..." } }
        ],
        toolResults: [ticket!, activate!, visit!],
        routePolicy: buildRoutePolicy("tool_call", "deterministic", { solverModel: "pro", reason: "Fase C Reactivación: Ticket + Activación + Visita" }),
        durationMs: elapsed(),
      };
    }
  }


  console.log(`[ROUTER_DECISION] Clasificada intención: ${intent.category} (Confianza: ${intent.confidence})`);

  // OVERRIDE MULTICONTRACTO ESTÁTICO:
  if ((clientData?.totalContracts ?? 0) > 1 && !clientData?.contract) {
    // 1. Detección de selección numérica (ej: "4929")
    const cleanMessage = message.trim().replace("#", "");
    const matchingContract = clientData?.allContracts?.find(c => String(c.contractId) === cleanMessage);

    if (matchingContract) {
      console.log(`[ROUTER_DECISION] Selección de contrato detectada: ${cleanMessage}. Forzando confirmación.`);
      return {
        noToolNeeded: true,
        toolCalls: [],
        toolResults: [],
        directResponse: `¡Perfecto! He seleccionado el **Contrato #${cleanMessage}** (${matchingContract.planName || "Servicio Activo"}). ¿En qué puedo ayudarte ahora con este servicio? 🛠️`,
        routePolicy: buildRoutePolicy("direct_response", "deterministic", {
          reason: "Selección determinista de contrato por ID",
        }),
        durationMs: elapsed(),
        intentClassification: intent,
      };
    }

    const forcedResponse = buildNoToolDirectResponse(message, clientData, conversationLength);
    if (forcedResponse) {
      console.log(`[ROUTER_DECISION] ¡Multicontrato Detectado! Forzando respuesta determinista inmediata.`);
      return {
        noToolNeeded: true,
        toolCalls: [],
        toolResults: [],
        directResponse: forcedResponse,
        routePolicy: buildRoutePolicy("direct_response", "deterministic", {
          reason: "Multicontrato inicial forzado (Fast Path Ineludible)",
        }),
        durationMs: elapsed(),
        intentClassification: intent,
      };
    }
  }

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

  const explicitCloseRequest = isExplicitCloseRequest(message);
  
  const allowEscalationTool = true;
  const allowCloseTool = true;

  const routerTools = filterToolsForRouter(tools, {
    allowEscalation: allowEscalationTool,
    allowClose: allowCloseTool,
  });
  
  const isAmbiguousSupportIssue =
    (intent.category === "PROBLEMA_TECNICO" || 
     intent.category === "ESCALACION" || 
     intent.category === "CONSULTA_PERSONAL" || 
     contextualEscalation.shouldEnableEscalation) &&
    (clientData?.totalContracts ?? 0) > 1 &&
    !clientData?.contract &&
    !hasExplicitContractReference(message, clientData) &&
    contextualEscalation.source !== "confirmation";

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
    const isAdministrative =
      contextualEscalation.reason?.toLowerCase().includes("reactivaci") ||
      clientData?.serviceStatus === "cancelled" ||
      intent.category === "INFO_ADMINISTRATIVO";

    // Detectar si el mensaje contiene una fecha/hora (señal de que ya pasó por el calendario)
    const hasDateTime = /(lunes|martes|miercoles|jueves|viernes|sabado|domingo|\d{1,2}\/\d{1,2}|mañana|tarde|en la mañana|en la tarde)/i.test(message);

    // Solo escalamos de inmediato si es administrativo O si ya tenemos fecha/hora de visita.
    // Si es técnico y NO tiene fecha/hora, NO llamamos a la herramienta aquí; dejamos que el Solver muestre el calendario.
    if (isAdministrative || hasDateTime) {
      const escalationReason = buildEscalationReason(intent, contextualEscalation.reason);
      const forcedEscalation = isAdministrative
        ? await executeForced("create_glpi_ticket", { name: "Reactivación/Admin", content: escalationReason }, routerTools)
        : await executeForcedEscalation(routerTools, sessionId!, escalationReason);

      if (forcedEscalation) {
        return {
          noToolNeeded: false,
          toolCalls: [{ toolName: forcedEscalation.toolName, args: isAdministrative ? { name: "Reporte", content: escalationReason } : { sessionId, reason: escalationReason } }],
          toolResults: [forcedEscalation],
          routePolicy: buildRoutePolicy("tool_call", "deterministic", {
            solverModel: "pro",
            reason: isAdministrative ? "Escalamiento administrativo directo" : "Escalamiento técnico con cita confirmada",
          }),
          durationMs: elapsed(),
          intentClassification: intent,
        };
      }
    }
  }

  const shouldForceClose =
    Boolean(sessionId) &&
    allowCloseTool &&
    intent.category === "CIERRE_CONFIRMADO" &&
    explicitCloseRequest;

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
    const plansQuery = buildPlansQueryForClientUsage(clientData, message);
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

  const directResponse = buildNoToolDirectResponse(message, clientData, conversationLength);
  const isStandardFaq = ["CONVERSACIONAL", "CIERRE_CONFIRMADO", "INFO_EMPRESA", "INFO_COBERTURA", "INFO_PLANES"].includes(intent.category);

  if (isStandardFaq && directResponse) {
    const lastAssistantMsg = conversationHistory
      .filter(m => m.role === "assistant" || m.role === "model")
      .slice(-1)[0]?.content;

    if (lastAssistantMsg && lastAssistantMsg.trim() === directResponse.trim()) {
      return {
        noToolNeeded: true,
        toolCalls: [],
        toolResults: [],
        routePolicy: buildRoutePolicy("solver", "fallback", {
          solverModel: "flash",
          reason: "Respuesta directa duplicada detectada, delegando al solver para variar",
        }),
        durationMs: elapsed(),
        intentClassification: intent,
      };
    }

    return {
      noToolNeeded: true,
      toolCalls: [],
      toolResults: [],
      directResponse,
      routePolicy: buildRoutePolicy("direct_response", "deterministic", {
        reason: `Fast path sin herramienta para ${intent.category} (Respuesta determinista)`,
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
        routePolicy: buildRoutePolicy("tool_call", "deterministic", {
          solverModel: fallbackSolverModel,
          reason: `Tool forzada por regex (Short-circuit) para ${intent.category}`,
        }),
        durationMs: elapsed(),
        intentClassification: intent,
      };
    }
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
        routePolicy: buildRoutePolicy("tool_call", "deterministic", {
          solverModel: fallbackSolverModel,
          reason: `Tool forzada por regex (Short-circuit) para ${intent.category}`,
        }),
        durationMs: elapsed(),
        intentClassification: intent,
      };
    }
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

  // Ya procesado arriba como short-circuit
  

  if (intent.confidence === "alta" && intent.suggestedTool && FAST_PATH_EXCLUDED_CATEGORIES.has(intent.category)) {
  }

  try {
    const { result, retriedModel } = await callGeminiWithFallback(message, clientData, routerTools, sessionId, conversationHistory);
    const res = result as { text?: string; steps?: unknown[] };

    const responseText = res.text?.trim() || "";
    const { toolCalls, toolResults } = extractStepResults(res.steps || []);

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
      
      // PRIORIDAD: Señal contextual (confirmación de detalles o flujo activo)
      if (contextualEscalation.shouldEnableEscalation && sessionId) {
        const escalationReason = buildEscalationReason(intent, contextualEscalation.reason);
        const forcedEscalation = await executeForcedEscalation(routerTools, sessionId, escalationReason);
        if (forcedEscalation) {
          return {
            noToolNeeded: false,
            toolCalls: [{ toolName: forcedEscalation.toolName, args: { sessionId, reason: escalationReason } }],
            toolResults: [forcedEscalation],
            routePolicy: buildRoutePolicy("tool_call", "deterministic", {
              solverModel: "pro",
              reason: "Forzado por señal contextual (continuidad del flujo)",
            }),
            durationMs: elapsed(),
            intentClassification: intent,
            retriedModel,
          };
        }
      }

      if (intent.confidence === "alta" && intent.suggestedTool) {
        if ((intent.suggestedTool === "escalate_to_specialist" || contextualEscalation.shouldEnableEscalation) && sessionId) {
          const escalationReason = buildEscalationReason(intent, contextualEscalation.reason);
          const forcedEscalation = await executeForcedEscalation(routerTools, sessionId, escalationReason);
          if (forcedEscalation) {
            return {
              noToolNeeded: false,
              toolCalls: [{ toolName: forcedEscalation.toolName, args: { sessionId, reason: escalationReason } }],
              toolResults: [forcedEscalation],
              routePolicy: buildRoutePolicy("tool_call", "deterministic", {
                solverModel: "pro",
                reason: contextualEscalation.shouldEnableEscalation ? "Forzado por señal contextual (confirmación)" : "Override de escalamiento por regex",
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
  } catch {
    return buildErrorFallback(message, clientData, tools, intent, elapsed, sessionId, contextualEscalation.reason, explicitCloseRequest);
  }
}


async function callGeminiWithFallback(
  message: string,
  clientData: ClientContextData | undefined,
  routerTools: LocalToolSet,
  sessionId?: string,
  conversationHistory: RouterConversationMessage[] = []
): Promise<{ result: unknown; retriedModel?: string }> {
  const promptWithHistory = buildRouterInputWithHistory(message, conversationHistory);

  for (let i = 0; i < MODEL_CHAIN.length; i++) {
    const modelName = MODEL_CHAIN[i];
    const isLast = i === MODEL_CHAIN.length - 1;
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      const abortController = new AbortController();
      const timeoutMs = getRouterTimeoutMs(i);
      timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

      const result = await generateText({
        model: google(modelName),
        system: buildRouterPrompt(clientData, sessionId),
        prompt: promptWithHistory,
        tools: routerTools as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        stopWhen: stepCountIs(MAX_TOOL_STEPS),
        temperature: ROUTER_TEMPERATURE,
        maxOutputTokens: 1024,
        maxRetries: 0,
        abortSignal: abortController.signal,
      });
      clearTimeout(timeoutId);
      return { result, retriedModel: i > 0 ? modelName : undefined };
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isAbort = errorMsg.includes("abort") || (err instanceof Error && err.name === "AbortError");
      const isNotFound = errorMsg.includes("not found") || errorMsg.includes("404");

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
  tools: LocalToolSet,
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
