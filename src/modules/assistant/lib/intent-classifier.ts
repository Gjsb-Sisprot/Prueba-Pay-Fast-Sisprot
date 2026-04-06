
import { INTENT_RULES, SISPROT_MENTION_FALLBACK, UNKNOWN_INTENT } from "./intent-rules";

const CONVERSATIONAL_FALLBACK_PHRASES: RegExp[] = [
  /^mucho\s+gusto$/i,
  /^un\s+gusto$/i,
  /^igualmente$/i,
  /^encantad[oa]$/i,
  /^el\s+gusto\s+es\s+m[ii]o$/i,
  /^como\s+estas$/i,
  /^todo\s+bien$/i,
];

const CONVERSATIONAL_SHORT_TOKENS = new Set([
  "hola",
  "buenas",
  "buenos",
  "gracias",
  "ok",
  "okey",
  "okie",
  "perfecto",
  "genial",
  "claro",
  "dale",
  "epa",
  "epale",
  "qlq",
  "klk",
  "hey",
  "saludos",
  "igualmente",
  "encantado",
  "encantada",
  "gusto",
  "vale",
  "va",
  "entendido",
  "acuerdo",
]);

function normalizeIntentText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyConversationalShortMessage(normalizedMsg: string): IntentClassification | null {
  if (!normalizedMsg) return null;

  const tokens = normalizedMsg.split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 4) return null;

  if (CONVERSATIONAL_FALLBACK_PHRASES.some((pattern) => pattern.test(normalizedMsg))) {
    return {
      category: "CONVERSACIONAL",
      confidence: "alta",
      suggestedTool: null,
      suggestedQuery: null,
      reasoning: "Fallback conversacional por frase corta",
    };
  }

  const tokenHits = tokens.filter((token) => CONVERSATIONAL_SHORT_TOKENS.has(token)).length;
  const requiredHits = tokens.length <= 2 ? tokens.length : tokens.length - 1;

  if (tokenHits >= requiredHits) {
    return {
      category: "CONVERSACIONAL",
      confidence: "media",
      suggestedTool: null,
      suggestedQuery: null,
      reasoning: "Fallback conversacional por tokens sociales",
    };
  }

  return null;
}


export type IntentCategory =
  | "INFO_EMPRESA"
  | "INFO_PLANES"
  | "INFO_COBERTURA"
  | "INFO_PAGOS"
  | "INFO_ADMINISTRATIVO"
  | "INFO_INSTALACION"
  | "PROBLEMA_TECNICO"
  | "CONSULTA_PERSONAL"
  | "CONVERSACIONAL"
  | "SEGUIMIENTO"
  | "ESCALACION"
  | "CIERRE_CONFIRMADO"
  | "DESCONOCIDO";

export interface IntentClassification {
  category: IntentCategory;
  confidence: "alta" | "media" | "baja";
  suggestedTool: string | null;
  suggestedQuery: string | null;
  reasoning: string;
}


export function classifyIntent(message: string): IntentClassification {
  const msgLower = message.toLowerCase().trim();
  const normalizedMsg = normalizeIntentText(message);

  for (const rule of INTENT_RULES) {
    if (rule.extraCheck && !rule.extraCheck(msgLower) && !rule.extraCheck(normalizedMsg)) continue;

    for (const pattern of rule.patterns) {
      if (pattern.test(msgLower) || pattern.test(normalizedMsg)) {
        return {
          category: rule.category,
          confidence: rule.confidence,
          suggestedTool: rule.tool,
          suggestedQuery: rule.query,
          reasoning: `Patrón detectado: ${pattern.source}`,
        };
      }
    }
  }

  if (/sisprot/i.test(msgLower)) {
    return SISPROT_MENTION_FALLBACK;
  }

  const conversationalFallback = classifyConversationalShortMessage(normalizedMsg);
  if (conversationalFallback) {
    return conversationalFallback;
  }

  return UNKNOWN_INTENT;
}
