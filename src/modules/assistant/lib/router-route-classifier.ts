import type { ClientContextData } from "./types";
import type { IntentClassification } from "./intent-classifier";
import type { RouterConversationMessage } from "./router-intent-guards";

export type PreferredSolverModel = "flash" | "pro";

export interface NativeRouteDecision {
  route: "tool_call" | "solver_flash" | "solver_pro";
  answerComplexity: PreferredSolverModel;
  confidence: number;
  reason: string;
}

interface ClassifyRouteInput {
  message: string;
  clientData?: ClientContextData;
  intent: IntentClassification;
  conversationHistory?: RouterConversationMessage[];
}

const AI_ROUTE_CLASSIFIER_ENABLED = (process.env.AI_ROUTE_CLASSIFIER_ENABLED ?? "true").toLowerCase() !== "false";
const AI_ROUTE_CLASSIFIER_MODEL = process.env.AI_ROUTE_CLASSIFIER_MODEL?.trim() || "gemini-2.5-flash-lite";
const AI_ROUTE_CLASSIFIER_TIMEOUT_MS = parsePositiveInt(process.env.AI_ROUTE_CLASSIFIER_TIMEOUT_MS, 5000);
const AI_ROUTE_CLASSIFIER_MIN_CONFIDENCE = parseConfidence(process.env.AI_ROUTE_CLASSIFIER_MIN_CONFIDENCE, 0.6);
const AI_ROUTE_CLASSIFIER_DEBUG = (process.env.AI_ROUTE_CLASSIFIER_DEBUG ?? "false").toLowerCase() === "true";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed < 1000) return fallback;
  return parsed;
}

function parseConfidence(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) return fallback;
  return parsed;
}

function summarizeClientContext(clientData?: ClientContextData): string {
  if (!clientData) return "sin contexto autenticado";

  const lines = [
    clientData.identification ? `identificacion: ${clientData.identification}` : undefined,
    clientData.contract ? `contrato principal: ${clientData.contract}` : undefined,
    clientData.planName ? `plan: ${clientData.planName}` : undefined,
    clientData.serviceStatus ? `estado servicio: ${clientData.serviceStatus}` : undefined,
    typeof clientData.debtAmount === "number" ? `deuda total: ${clientData.debtAmount}` : undefined,
    typeof clientData.totalContracts === "number" ? `total contratos: ${clientData.totalContracts}` : undefined,
    clientData.contractTag ? `tag contrato: ${clientData.contractTag}` : undefined,
  ].filter((value): value is string => Boolean(value));

  return lines.join("\n") || "sin atributos relevantes";
}

function summarizeHistory(conversationHistory: RouterConversationMessage[] = []): string {
  const recentTurns = conversationHistory
    .filter((entry) => entry.role !== "tool" && entry.content?.trim())
    .slice(-6)
    .map((entry) => `${entry.role}: ${entry.content.trim()}`);

  return recentTurns.join("\n") || "sin historial reciente";
}

function buildClassifierPrompt(input: ClassifyRouteInput): string {
  return [
    "Clasifica la ruta del siguiente mensaje para una arquitectura router-solver de un ISP.",
    "Solo decides la ruta. No redactes respuesta para el usuario.",
    "",
    "Rutas validas:",
    "- tool_call: hace falta usar herramientas internas antes de responder.",
    "- solver_flash: no hace falta tool y el solver rapido es suficiente.",
    "- solver_pro: no hace falta tool, pero la respuesta requiere razonamiento o sintesis mas profunda.",
    "",
    "Reglas:",
    "- Usa tool_call para planes, precios, cobertura, pagos, soporte tecnico, estado del servicio, escalamiento, cierre, o cuando debas verificar datos con sistemas.",
    "- Usa solver_flash para conversacion simple, seguimientos cortos, reformulaciones y respuestas apoyadas principalmente en contexto ya inyectado.",
    "- Usa solver_pro para quejas complejas, multiples pedidos en un solo turno, ambiguedad alta, sintesis larga, o cuando debas cruzar varios hechos con cautela.",
    "- answerComplexity debe ser flash o pro. Si eliges solver_flash entonces answerComplexity=flash. Si eliges solver_pro entonces answerComplexity=pro.",
    "- Si eliges tool_call, answerComplexity indica que solver usar despues de las tools.",
    "- confidence va de 0 a 1.",
    "- reason debe ser corto y concreto.",
    "",
    `INTENCION_REGEX: ${input.intent.category} | confianza=${input.intent.confidence} | suggestedTool=${input.intent.suggestedTool ?? "ninguna"}`,
    "",
    "CONTEXTO_CLIENTE:",
    summarizeClientContext(input.clientData),
    "",
    "HISTORIAL_RECIENTE:",
    summarizeHistory(input.conversationHistory),
    "",
    "MENSAJE_ACTUAL:",
    input.message,
  ].join("\n");
}

function safeConfidence(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(1, parsed));
}

function isValidDecision(value: unknown): value is NativeRouteDecision {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  const route = candidate.route;
  const answerComplexity = candidate.answerComplexity;

  return (
    (route === "tool_call" || route === "solver_flash" || route === "solver_pro") &&
    (answerComplexity === "flash" || answerComplexity === "pro") &&
    typeof candidate.reason === "string"
  );
}

export function getFallbackSolverModel(
  intent: IntentClassification,
  clientData?: ClientContextData,
  conversationHistory: RouterConversationMessage[] = [],
  toolResultsCount = 0
): PreferredSolverModel {
  if (toolResultsCount > 0) {
    if (intent.category === "PROBLEMA_TECNICO" || intent.category === "ESCALACION" || intent.category === "CIERRE_CONFIRMADO") {
      return "pro";
    }
    return "flash";
  }

  if (intent.category === "CONSULTA_PERSONAL" || intent.category === "SEGUIMIENTO") {
    return "pro";
  }

  if (intent.category === "PROBLEMA_TECNICO" && (clientData?.totalContracts ?? 0) > 1) {
    return "pro";
  }

  if (conversationHistory.length >= 10 && intent.category === "DESCONOCIDO") {
    return "pro";
  }

  return "flash";
}

export async function classifyNativeRouteDecision(input: ClassifyRouteInput): Promise<NativeRouteDecision | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || !AI_ROUTE_CLASSIFIER_ENABLED) {
    return null;
  }

  const prompt = buildClassifierPrompt(input);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_ROUTE_CLASSIFIER_MODEL}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(AI_ROUTE_CLASSIFIER_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              route: {
                type: "STRING",
                enum: ["tool_call", "solver_flash", "solver_pro"],
              },
              answerComplexity: {
                type: "STRING",
                enum: ["flash", "pro"],
              },
              confidence: {
                type: "NUMBER",
                minimum: 0,
                maximum: 1,
              },
              reason: {
                type: "STRING",
              },
            },
            required: ["route", "answerComplexity", "confidence", "reason"],
            propertyOrdering: ["route", "answerComplexity", "confidence", "reason"],
          },
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Route classifier failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
    if (!text) return null;

    const parsed = JSON.parse(text) as unknown;
    if (!isValidDecision(parsed)) return null;

    const decision: NativeRouteDecision = {
      ...parsed,
      confidence: safeConfidence((parsed as { confidence?: unknown }).confidence),
      reason: (parsed as { reason: string }).reason.trim(),
    };

    if (decision.confidence < AI_ROUTE_CLASSIFIER_MIN_CONFIDENCE) {
      if (AI_ROUTE_CLASSIFIER_DEBUG) {
      }
      return null;
    }

    if (AI_ROUTE_CLASSIFIER_DEBUG) {
    }

    return decision;
  } catch {
    return null;
  }
}
