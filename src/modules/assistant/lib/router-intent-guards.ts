
import type { ClientContextData } from "./types";

export interface RouterConversationMessage {
  role: "user" | "assistant" | "model" | "tool";
  content: string;
}

const EXPLICIT_ESCALATION_PATTERNS: RegExp[] = [
  /hablar\s*(con\s*)?(un\s|una\s)?(human[oa]|agente|operador|persona|asesor|t[eé]cnico|especialista|alguien)/i,
  /quiero\s*(un\s|una\s)?(human[oa]|agente|operador|asesor|t[eé]cnico|especialista)/i,
  /necesito\s*(un\s|una\s)?(human[oa]|agente|operador|asesor|t[eé]cnico|especialista|ayuda\s+humana)/i,
  /p[aá]same\s*(con\s*)?(un\s|una\s)?(human[oa]|agente|operador|asesor|t[eé]cnico|especialista|alguien)/i,
  /escalar|escalamiento|escalame|escalarlo/i,
  /atenci[oó]n\s*(de\s*)?(un\s|una\s)?(human[oa]|agente|operador|asesor|t[eé]cnico|especialista)/i,
  /comunicarme\s+con\s+(asesor|agente|operador|alguien|human[oa])/i,
  /crear?\s*(un\s*)?(ticket|reporte|incidencia|folio)/i,
  /agendar\s*(la\s*)?(visita|cita|t[eé]cnico)/i,
  /abre\s*(el\s*)?reporte/i,
  /genera\s*(el\s*)?ticket/i
];

const ESCALATION_NEGATION_PATTERNS: RegExp[] = [
  /no\s+(quiero|deseo|necesito|hace\s*falta)\s+(hablar|escalar)/i,
  /no\s+me\s+escal(es|en|es)?/i,
  /sin\s+escalar/i,
];

const EXPLICIT_CLOSE_PATTERNS: RegExp[] = [
  /^(gracias?|muchas\s+gracias)[\s,]*(eso\s*es|es)\s*todo[\s.!?]*$/i,
  /^(gracias?|muchas\s+gracias)[\s,]*nada\s*m[áa]s[\s.!?]*$/i,
  /^(eso\s*es|es)\s*todo[\s.!?]*$/i,
  /^nada\s*m[áa]s[\s.!?]*$/i,
  /^(ya\s*)?(no\s*)?(necesito|hace\s*falta)\s*(nada\s*)?m[áa]s/i,
  /^(ya\s*)?(qued[oó]|est[aá])\s*(resuelto|solucionado|listo|bien)/i,
  /^(puedes\s*)?(cerrar|cierra|ci[ée]rrala|cierrala|ci[ée]rralo|cerralo)(\s*(el|la)?\s*(conversaci[oó]n|conv|conve|chat|ticket|tk))?[\s.!?]*$/i,
  /^(chao|adi[oó]s|bye|hasta\s*luego|nos\s*vemos)[\s.!?]*$/i,
  /cierra\s*(esto|la\s*conv|el\s*chat)/i,
  /ya\s*terminamos/i,
  /termina\s*la\s*conversaci[oó]n/i
];

const CLOSE_NEGATION_PATTERNS: RegExp[] = [
  /no\s+(cierres?|cierres\s+la\s+conversaci[oó]n)/i,
  /a[uú]n\s+no\s+(termino|terminamos|cierres?)/i,
  /todav[ií]a\s+no\s+(termino|terminamos|cierres?)/i,
];

export function isExplicitEscalationRequest(message: string): boolean {
  const normalized = message.trim();
  if (!normalized) return false;
  if (ESCALATION_NEGATION_PATTERNS.some((pattern) => pattern.test(normalized))) return false;
  return EXPLICIT_ESCALATION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isExplicitCloseRequest(message: string): boolean {
  const normalized = message.trim();
  if (!normalized) return false;
  if (CLOSE_NEGATION_PATTERNS.some((pattern) => pattern.test(normalized))) return false;
  return EXPLICIT_CLOSE_PATTERNS.some((pattern) => pattern.test(normalized));
}

const CONTRACT_REFERENCE_PATTERNS: RegExp[] = [
  /contrato\s*#?\s*\d{3,}/i,
  /orden\s*(de\s*instalaci[oó]n)?\s*#?\s*\d{3,}/i,
  /\b#\d{3,}\b/i,
  /\bsector\s+[\w\s-]{3,}/i,
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function hasExplicitContractReference(message: string, clientData?: ClientContextData): boolean {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return false;

  if (CONTRACT_REFERENCE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  const contracts = clientData?.allContracts;
  if (!contracts?.length) return false;

  for (const contract of contracts) {
    const contractId = String(contract.contractId);
    const contractRegex = new RegExp(`(?:contrato\\s*#?\\s*${escapeRegex(contractId)}\\b|#${escapeRegex(contractId)}\\b)`, "i");
    if (contractRegex.test(message)) return true;

    const installationOrder = contract.installationOrder?.toLowerCase().trim();
    if (installationOrder && normalized.includes(installationOrder)) return true;

    const sector = contract.sector?.toLowerCase().trim();
    if (sector && sector.length >= 4 && normalized.includes(sector)) return true;
  }

  return false;
}

const FOLLOW_UP_ACK_PATTERNS: RegExp[] = [
  /^s[ií],?\s*dale$/i,
  /^dale,?\s*s[ií]$/i,
  /^(s[ií]|si|ok|okey|okay|claro|exacto|correcto),?\s*(dale|contin[úu]a|sigue|m[aá]s)?$/i,
  /^(dale|contin[úu]a|sigue|m[aá]s),?\s*(por\s*fa(vor)?|porfa)?$/i,
  /^(s[ií]|si),?\s*(por\s*f[aá](?:v|b)?(?:o|0|i)?r|porfa|porfavor),?\s*(dale|contin[úu]a|sigue|ap[úu]rate|r[aá]pido)?$/i,
  /^(ok|okey|okay),?\s*(por\s*fa(vor)?|porfavor),?\s*(dale|contin[úu]a|sigue)?$/i,
  /^(s[ií]|si),?\s*(ap[úu]rate|r[aá]pido)$/i,
];

const FOLLOW_UP_SELECTION_PATTERNS: RegExp[] = [
  /^el\s+(primero|segundo|tercero|cuarto|quinto)$/i,
  /^la\s+(primera|segunda|tercera|cuarta|quinta)$/i,
  /^opci[oó]n\s*\d{1,2}$/i,
  /^n[uú]mero\s*\d{1,2}$/i,
  /^al\s+que\s+comienza\s+por/i,
  /^el\s+que\s+comienza\s+por/i,
  /^(el|la)\s+de\s+.+$/i,
];

const URGENCY_FOLLOW_UP_PATTERNS: RegExp[] = [
  /ap[úu]rate/i,
  /r[aá]pido/i,
  /de\s+una/i,
  /lo\s+antes\s+posible/i,
];

const ASSISTANT_OPTION_PROMPT_PATTERNS: RegExp[] = [
  /cu[aá]l\s+(prefieres|plan|opci[oó]n|n[uú]mero)/i,
  /necesito\s+confirmar\s+a\s+cu[aá]l/i,
  /ind[ií]ca(?:me)?\s+a\s+cu[aá]l\s+(corresponde|aplicar|aplica|deseas?)/i,
  /a\s+cu[aá]l\s+de\s+(ellos|estos|esos)/i,
  /elige|escoge|selecciona/i,
  /opci[oó]n\s*\d+/i,
  /plan\s+\d+/i,
  /comienza\s+por/i,
  /solo\s+me\s+falta\s+un\s+detalle/i,
  /me\s+falta\s+un\s+detalle/i,
];

export function isLikelyFollowUpAcknowledgment(message: string): boolean {
  const normalized = message.trim();
  if (!normalized) return false;
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 6) return false;
  return FOLLOW_UP_ACK_PATTERNS.some((pattern) => pattern.test(normalized));
}

const AFFIRMATIVE_ESCALATION_PATTERNS: RegExp[] = [
  /^s[ií]$/i,
  /^s[ií],?\s*dale$/i,
  /^s[ií],?\s*por\s*fa(vor)?$/i,
  /^(s[ií]|si),?\s*porfavor$/i,
  /^(s[ií]|si|s),?\s*(por\s*f[aá](?:v|b)?(?:o|0|i)?r|porfa|porfavor),?\s*(dale|hazlo|procede|ap[úu]rate)?$/i,
  /^claro,?\s*(por\s*fa(vor)?|porfavor)?$/i,
  /^dale$/i,
  /^claro$/i,
  /^ok(?:ey|ay)?$/i,
  /^correcto$/i,
  /^exacto$/i,
  /^hazlo$/i,
  /^procede(mos)?$/i,
  /^h[aá]galo$/i,
  /^(s[ií]|si),?\s*procede(mos)?$/i,
  /^(s[ií]|si),?\s*claro$/i,
  /^(s[ií]|si),?\s*est[aá] bien$/i,
  /^est[aá] bien$/i,
  /^avanza$/i,
  /^usa?lo$/i,
  /^usa?la$/i,
  /^usa(lo|la)$/i,
  /^ese\s+mismo$/i,
  /^esa\s+misma$/i,
  /^los\s+mismos$/i,
  /^las\s+mismas$/i,
  /^hazlo$/i,
  /^solo\s+hazlo$/i,
  /^(no,?\s*)?solo\s+hazlo$/i,
  /^procede\s+de\s+una\s+vez$/i,
];

const ASSISTANT_ESCALATION_CONFIRM_PATTERNS: RegExp[] = [
  /(deseas?|quieres?|te\s+gustar[ií]a|procedemos).{0,120}(escal|pas(e|ar)|transferi).{0,80}(especialista|agente|humano)/i,
  /(confirm(?:ar|es|a|o)).{0,120}(escal|transferi|especialista|agente|humano)/i,
  /(?:\bescalar\b|\bescalarte\b|\btransferirte\b|\btransferir\b|\bpasarte\b).{0,80}\?/i,
  /transferir[eé]?\s+tu\s+solicitud\s+a\s+(?:uno\s+de\s+)?nuestros\s+especialistas/i,
  /confirmas?.{0,50}(usar|utilizar).{0,50}(n[uú]mero|tel[eé]fono|contacto|m[oó]vil)/i,
  /deseas?.{0,50}dejar.{0,50}(n[uú]mero|tel[eé]fono|contacto|m[oó]vil).{0,50}(alternativo|diferente)/i,
  /(observaci[oó]n|detalle|comentario|informaci[oó]n|dato|referencia|horario|preferencia).{0,50}(adicional|extra|m[aá]s|visita)/i,
  /antes\s+de\s+procesar.{0,50}sistema/i,
];

const ASSISTANT_ESCALATION_PROMISE_PATTERNS: RegExp[] = [
  /(escalar[eé]|escalaremos|escalar|transferir[eé]|transferiremos|transferir).{0,80}(especialista|agente|humano)/i,
  /(especialista|agente|humano).{0,80}(se\s+pondr[aá]|se\s+contactar[aá]|contactar[aá])/i,
  /como\s+esta\s+modificaci[oó]n\s+requiere/i,
];

const ASSISTANT_SINGLE_DETAIL_PATTERNS: RegExp[] = [
  /solo\s+me\s+falta\s+un\s+detalle/i,
  /me\s+falta\s+un\s+detalle/i,
  /necesito\s+confirmar\s+a\s+cu[aá]l/i,
  /ind[ií]ca(?:me)?\s+a\s+cu[aá]l/i,
  /[uú]ltim[oa]\s+detalle/i,
  /para\s+completar\s+la\s+solicitud/i,
  /para\s+procesarlo/i,
];

const ASSISTANT_DETAIL_QUESTION_HINTS: RegExp[] = [
  /a\s+cu[aá]l/i,
  /a\s+cu[aá]l\s+de\s+(ellos|estos|esos)/i,
  /a\s+cu[aá]l\s+corresponde/i,
  /a\s+cu[aá]l\s+(quieres?|deseas?)/i,
  /ind[ií]ca(?:me)?\s+a\s+cu[aá]l/i,
  /qu[eé]\s+plan/i,
  /qu[eé]\s+servicio/i,
  /n[uú]mero\s+de\s+contrato/i,
  /qu[eé]\s+contrato/i,
  /qu[eé]\s+opci[oó]n/i,
  /(observaci[oó]n|detalle|comentario|informaci[oó]n|dato|referencia|horario|preferencia|punto).{0,50}(adicional|extra|m[aá]s|visita|ubicacion)/i,
];

const FLOW_ESCALATION_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /cambio\s*(de\s*)?plan|cambiar(me)?\s*(de\s*)?plan|migrar\s*(de\s*)?plan|subir(me)?\s*(de\s*)?plan|bajar(me)?\s*(de\s*)?plan/i,
    reason: "gestion de cambio de plan",
  },
  {
    pattern: /falla\s*(de\s*)?(encendido|conexi[oó]n)|no\s*enciende|sin\s*internet|luz\s*roja|problema\s*t[eé]cnico/i,
    reason: "soporte tecnico por falla",
  },
  {
    pattern: /cancel(ar|aci[oó]n)|dar\s*(de\s*)?baja|suspender\s*mi\s*servicio/i,
    reason: "gestion de cancelacion",
  },
  {
    pattern: /devoluci[oó]n|reembolso|pago\s*(duplicado|equivocado|incorrecto)/i,
    reason: "gestion de reembolso",
  },
  {
    pattern: /mudan(za|me)|cambio\s*(de\s*)?titular|trasladar/i,
    reason: "gestion administrativa",
  },
  {
    pattern: /reclamo|queja|facturaci[oó]n|ajuste\s*de\s*factura/i,
    reason: "gestion de reclamo administrativo",
  },
];

const DETAIL_SELECTION_PATTERNS: RegExp[] = [
  /^\d{1,2}$/i,
  /^n[uú]mero\s*\d{1,2}$/i,
  /^el\s+n[uú]mero\s*\d{1,2}$/i,
  /^al\s+(primer|segundo|tercer|tercero|cuarto|quinto)\s+contrato$/i,
  /^(primer|segundo|tercer|tercero|cuarto|quinto)\s+contrato$/i,
  /^opci[oó]n\s*\d{1,2}$/i,
  /^el\s+plan\s+\d{1,2}$/i,
  /^(al\s+)?contrato\s+(n[uú]mero|numero)\s*#?\s*\d{3,}$/i,
  /^el\s+de\s+.+$/i,
  /^la\s+de\s+.+$/i,
  /^contrato\s*#?\s*\d{3,}$/i,
  /^#\d{3,}$/i,
];

function isAffirmativeEscalationConfirmation(message: string): boolean {
  const normalized = message.trim();
  if (!normalized) return false;
  
  if (EXPLICIT_ESCALATION_PATTERNS.some(p => p.test(normalized))) {
    return true;
  }

  if (/^no\b/i.test(normalized)) return false;

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 6) return false;

  return AFFIRMATIVE_ESCALATION_PATTERNS.some((pattern) => pattern.test(normalized));
}

function getLastAssistantMessage(conversationHistory: RouterConversationMessage[]): string {
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    if ((msg.role === "assistant" || msg.role === "model") && msg.content?.trim()) {
      return msg.content;
    }
  }

  return "";
}

function getRecentUserMessages(conversationHistory: RouterConversationMessage[], limit = 8): string[] {
  const userMessages: string[] = [];

  for (let i = conversationHistory.length - 1; i >= 0 && userMessages.length < limit; i--) {
    const msg = conversationHistory[i];
    if (msg.role === "user" && msg.content?.trim()) {
      userMessages.push(msg.content);
    }
  }

  return userMessages;
}

function detectEscalationFlowReason(userMessages: string[]): string {
  for (const msg of userMessages) {
    for (const flow of FLOW_ESCALATION_PATTERNS) {
      if (flow.pattern.test(msg)) {
        return flow.reason;
      }
    }
  }

  return "";
}

function isLikelySelectionResponse(message: string, clientData?: ClientContextData): boolean {
  const normalized = message.trim();
  if (!normalized) return false;

  if (hasExplicitContractReference(normalized, clientData)) return true;
  if (DETAIL_SELECTION_PATTERNS.some((pattern) => pattern.test(normalized))) return true;

  const words = normalized.split(/\s+/).filter(Boolean);
  return (
    words.length <= 6 &&
    (
      /^(el|la|ese|esa)\s+de\s+/i.test(normalized) ||
      /^al\s+(primer|segundo|tercer|tercero|cuarto|quinto)\b/i.test(normalized)
    )
  );
}

function assistantAskedForChoiceOrNextStep(lastAssistantMessage: string): boolean {
  if (!lastAssistantMessage) return false;

  return (
    ASSISTANT_OPTION_PROMPT_PATTERNS.some((pattern) => pattern.test(lastAssistantMessage)) ||
    ASSISTANT_DETAIL_QUESTION_HINTS.some((pattern) => pattern.test(lastAssistantMessage)) ||
    ASSISTANT_ESCALATION_CONFIRM_PATTERNS.some((pattern) => pattern.test(lastAssistantMessage)) ||
    ASSISTANT_ESCALATION_PROMISE_PATTERNS.some((pattern) => pattern.test(lastAssistantMessage))
  );
}

export function isLikelyContextualFollowUp(
  message: string,
  conversationHistory: RouterConversationMessage[] = [],
  clientData?: ClientContextData
): boolean {
  const normalized = message.trim();
  if (!normalized || conversationHistory.length === 0) return false;

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 10) return false;

  const looksLikeSelection =
    isLikelySelectionResponse(normalized, clientData) ||
    FOLLOW_UP_SELECTION_PATTERNS.some((pattern) => pattern.test(normalized));

  const looksLikeAcknowledgment =
    isLikelyFollowUpAcknowledgment(normalized) ||
    /^(s[ií]|si|ok|okey|claro|dale)\b/i.test(normalized);

  const hasUrgencyCue = URGENCY_FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(normalized));

  if (!looksLikeSelection && !(looksLikeAcknowledgment && hasUrgencyCue)) {
    return false;
  }

  const lastAssistantMessage = getLastAssistantMessage(conversationHistory);
  return assistantAskedForChoiceOrNextStep(lastAssistantMessage);
}

function asksSinglePendingDetail(message: string): boolean {
  if (!message) return false;

  if (ASSISTANT_SINGLE_DETAIL_PATTERNS.some((pattern) => pattern.test(message))) {
    return true;
  }

  const hasDetailHint = ASSISTANT_DETAIL_QUESTION_HINTS.some((pattern) => pattern.test(message));
  if (!hasDetailHint) return false;

  if (/(confirm|ind[ií]ca|dime|se[nñ]ala|elige|escoge|selecciona|corresponde)/i.test(message)) {
    return true;
  }

  const questionCount = (message.match(/\?/g) ?? []).length;
  return questionCount === 1;
}

export interface ContextualEscalationSignal {
  shouldEnableEscalation: boolean;
  reason?: string;
  source: "none" | "confirmation" | "flow_completion";
}

function cleanTextForMatching(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    .replace(/:[a-z0-9_-]+:/gi, "") // Iconos de MD
    .replace(/[¿?¡!.*_#\[\]()]/g, "") // Puntuación y MD
    .trim()
    .toLowerCase();
}

export function detectContextualEscalationSignal(
  message: string,
  conversationHistory: RouterConversationMessage[] = [],
  clientData?: ClientContextData
): ContextualEscalationSignal {
  if (conversationHistory.length === 0) {
    return { shouldEnableEscalation: false, source: "none" };
  }

  const normalized = cleanTextForMatching(message);
  const lastAssistantMessageRaw = conversationHistory
    .filter((entry) => entry.role === "assistant" || entry.role === "model")
    .slice(-1)[0]?.content || "";
  const lastAssistantMessage = cleanTextForMatching(lastAssistantMessageRaw);

  if (!lastAssistantMessage) {
    return { shouldEnableEscalation: false, source: "none" };
  }

  const askedEscalationConfirmation = ASSISTANT_ESCALATION_CONFIRM_PATTERNS.some((pattern) => pattern.test(lastAssistantMessage));
  if (askedEscalationConfirmation && isAffirmativeEscalationConfirmation(normalized)) {
    return {
      shouldEnableEscalation: true,
      reason: "Cliente confirmo explicitamente el escalamiento solicitado por el asistente.",
      source: "confirmation",
    };
  }

  const escalationFlowReason =
    detectEscalationFlowReason(getRecentUserMessages(conversationHistory)) ||
    detectEscalationFlowReason([lastAssistantMessage]);
  if (!escalationFlowReason) {
    return { shouldEnableEscalation: false, source: "none" };
  }

  const assistantMentionedEscalation = ASSISTANT_ESCALATION_PROMISE_PATTERNS.some((pattern) => pattern.test(lastAssistantMessage));
  if (!assistantMentionedEscalation) {
    return { shouldEnableEscalation: false, source: "none" };
  }

  if (!asksSinglePendingDetail(lastAssistantMessage)) {
    return { shouldEnableEscalation: false, source: "none" };
  }

  if (!isLikelySelectionResponse(normalized, clientData)) {
    return { shouldEnableEscalation: false, source: "none" };
  }

  return {
    shouldEnableEscalation: true,
    reason: `### Al escalar o crear reporte:
- **ORDEN DE EJECUCIÓN (CRÍTICO)**: 
  1. EJECUTA la función de creación de ticket (escalate_to_specialist).
  2. SOLO ENTONCES genera la respuesta indicando el ID.
- **FLUJO SIN FRICCIÓN**: Si el usuario confirma avanzar o si ya tienes la falla clara, **NO** preguntes por observaciones, referencias o horarios. Usa los datos existentes y GENERA el ticket ya.
- **AUTORIDAD**: Tú hablas en nombre del sistema. El ticket que generas es la solución inmediata de tu parte.
- **USO DE DATOS**: Usa el teléfono del contexto (módulo manual de "mobile") sin pedir permiso.
- Ejemplo: "He generado tu reporte oficial en GLPI con el ticket **#12345**. Un técnico te contactará pronto al número registrado. ¡Feliz día! 👋"
Cliente confirmo el dato final pendiente para ${escalationFlowReason}.`,
    source: "flow_completion",
  };
}
