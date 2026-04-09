import {
  CLOSE_OFFER_PREFIX,
  PAYMENT_ACTION_PREFIX,
  type ChatMessage,
} from "../lib/types";

const PAYMENT_ACTION_MARKER_DETECT_REGEX = /__PAYMENT_ACTION__|PAYMENT_ACTION\b/i;
const PAYMENT_ACTION_MARKER_STRIP_REGEX = /(?:__PAYMENT_ACTION__|PAYMENT_ACTION)\s*:?/gi;
const PORTAL_LINK_REGEX = /https?:\/\/portal\.sisprotgf\.com\/?/i;
const PORTAL_DOMAIN_REGEX = /\bportal\.sisprotgf\.com\b/i;
const PORTAL_LINK_STRIP_REGEX = /https?:\/\/portal\.sisprotgf\.com\/?/gi;
const PORTAL_DOMAIN_STRIP_REGEX = /\bportal\.sisprotgf\.com\b/gi;
const PORTAL_REDIRECT_PHRASE_REGEX = /\b(ingresa(?:r)?|entra(?:r)?|accede(?:r)?|dir[ií]gete|ve)\b[^\n.!?]{0,60}\b(?:al|a)\s+portal(?:\s+web)?\b/gi;
const PAYMENT_CONTEXT_REGEX = /\b(pagar|pago|pagos|deuda|transferencia|transferencias|pago movil|pago móvil|zelle|binance|paypal|m[eé]todos de pago|reportar(?:\s+tu)?\s+pago)\b/i;

export const CLOSE_CHAT_MARKER = "__CLOSE_CHAT__";
const CLOSE_CHAT_MARKER_STRIP_REGEX = /__CLOSE_CHAT__/gi;
const TICKET_ID_MARKER_STRIP_REGEX = /\[TICKET_ID:\d+\]/gi;

export function generateSessionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 11);
  return `chat-${timestamp}-${random}`;
}

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function stripPaymentActionMarkers(content: string): string {
  return content
    .replace(PAYMENT_ACTION_MARKER_STRIP_REGEX, "")
    .replace(CLOSE_CHAT_MARKER_STRIP_REGEX, "")
    .replace(TICKET_ID_MARKER_STRIP_REGEX, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizePaymentCopyForAuthenticatedPortal(content: string): string {
  return content
    .replace(PORTAL_LINK_STRIP_REGEX, "")
    .replace(PORTAL_DOMAIN_STRIP_REGEX, "")
    .replace(PORTAL_REDIRECT_PHRASE_REGEX, "usa esta misma interfaz")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function shouldActivatePaymentOffer(content: string): boolean {
  if (PAYMENT_ACTION_MARKER_DETECT_REGEX.test(content)) {
    return true;
  }

  const hasPortal = PORTAL_LINK_REGEX.test(content) || PORTAL_DOMAIN_REGEX.test(content);
  const hasPaymentContext = PAYMENT_CONTEXT_REGEX.test(content);

  return hasPortal && hasPaymentContext;
}

interface AssistantMessagePatch {
  role: ChatMessage["role"];
  content: string;
  closeOffer: boolean;
  paymentOffer: boolean;
}

interface AssistantStreamPatchOptions {
  isPortalAuthenticated?: boolean;
}

export function buildAssistantStreamPatch(
  assistantContent: string,
  options: AssistantStreamPatchOptions = {}
): AssistantMessagePatch {
  if (assistantContent.startsWith("__SYSTEM__")) {
    return {
      role: "system",
      content: assistantContent.replace("__SYSTEM__", ""),
      closeOffer: false,
      paymentOffer: false,
    };
  }

  if (assistantContent.startsWith(CLOSE_OFFER_PREFIX)) {
    return {
      role: "assistant",
      content: assistantContent.slice(CLOSE_OFFER_PREFIX.length),
      closeOffer: true,
      paymentOffer: false,
    };
  }

  if (shouldActivatePaymentOffer(assistantContent)) {
    const contentWithoutPrefix = assistantContent.startsWith(PAYMENT_ACTION_PREFIX)
      ? assistantContent.slice(PAYMENT_ACTION_PREFIX.length)
      : assistantContent;

    const cleanedPaymentContent = stripPaymentActionMarkers(contentWithoutPrefix);
    const paymentContent = options.isPortalAuthenticated
      ? sanitizePaymentCopyForAuthenticatedPortal(cleanedPaymentContent)
      : cleanedPaymentContent;

    return {
      role: "assistant",
      content: paymentContent,
      closeOffer: false,
      paymentOffer: true,
    };
  }

  return {
    role: "assistant",
    content: assistantContent,
    closeOffer: false,
    paymentOffer: false,
  };
}

export function mapHistoryToMessages(history: Array<{ role: string; content: string }>): ChatMessage[] {
  return history.map((msg, idx) => ({
    id: `history-${idx}`,
    role: msg.role === "model" ? "assistant" : (msg.role as ChatMessage["role"]),
    content: msg.role === "system" ? normalizeSystemMessageContent(msg.content) : msg.content,
    timestamp: new Date(),
  }));
}

export function normalizeSystemMessageContent(content: string): string {
  const raw = content.trim();

  const ticketMatch = raw.match(/ticket\s*#\s*(\d+)/i);
  if (ticketMatch?.[1]) {
    return `Tu número de ticket es: #${ticketMatch[1]}`;
  }

  return raw.replace(/Ticket\s+GLPI/gi, "Ticket");
}
