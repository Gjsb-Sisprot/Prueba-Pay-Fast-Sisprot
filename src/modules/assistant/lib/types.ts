

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface MediaAttachment {
  id: string;
  type: "image" | "video";
  url: string;
  mimeType: string;
  size: number;
  duration?: number;
  fileName?: string;
  frames?: string[];
  frameCount?: number;
}

export const CLOSE_OFFER_PREFIX = "__CLOSE_OFFER__";
export const PAYMENT_ACTION_PREFIX = "__PAYMENT_ACTION__";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  attachments?: MediaAttachment[];
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  closeOffer?: boolean;
  paymentOffer?: boolean;
}

export interface ToolCall {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  state: "pending" | "executing" | "completed" | "error";
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: unknown;
  error?: string;
}


export interface ClientContextData {
  identification: string;
  name: string;
  email?: string;
  phone?: string;
  contract?: string;
  order?: string;
  sector?: string;
  parish?: string;
  address?: string;
  planName?: string;
  cycle?: number;
  serviceStatus?: "active" | "suspended" | "paused" | "cancelled" | "pending";
  hasDebt?: boolean;
  debtAmount?: number;
  onuSerial?: string;
  debugQuery?: string;
  contractTag?: "available" | "verify" | "with_debt";
  clientType?: string;
  totalContracts?: number;
  activeContracts?: number;
  suspendedContracts?: number;
  allContracts?: Array<{
    contractId: number;
    installationOrder?: string;
    status: string;
    statusCode?: number;
    debt: number;
    hasDebt: boolean;
    isActive?: boolean;
    sector: string;
    parish?: string;
    planName?: string;
    address?: string;
    contractTag?: "available" | "verify" | "with_debt";
    onuSerial?: string;
    debtBs?: number;
    nextInvoiceValidationLog?: {
      notFound?: number;
      used?: number;
      error?: number;
      payment?: number;
      definitelyNotFound?: number;
      canceled?: number;
    } | null;
  }>;
  glpiTicketId?: number;
  summary?: string;
  reason?: string;
  specialistName?: string;
}


export type ConversationStatus = 
  | "active" 
  | "paused" 
  | "closed" 
  | "handed_over" 
  | "waiting_specialist";

export interface Conversation {
  id: string;
  sessionId: string;
  identification?: string;
  contract?: string;
  sector?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  summary?: string;
  status: ConversationStatus;
  glpiTicketId?: number | string | null;
  specialistName?: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export function canSendMessages(status: ConversationStatus): boolean {
  return status === "active";
}

export function isConversationLive(status: ConversationStatus): boolean {
  return status !== "closed";
}

export function getStatusLabel(status: ConversationStatus): string {
  const labels: Record<ConversationStatus, string> = {
    active: "Activa",
    paused: "Pausada",
    closed: "Cerrada",
    handed_over: "Con especialista",
    waiting_specialist: "En espera",
  };
  return labels[status] || status;
}

export interface MediaLimits {
  maxImages: number;
  maxVideos: number;
  maxVideoDuration: number;
  maxFileSize: number;
}

export const DEFAULT_MEDIA_LIMITS: MediaLimits = {
  maxImages: 10,
  maxVideos: 5,
  maxVideoDuration: 3,
  maxFileSize: 5 * 1024 * 1024,
};

export interface MediaUsage {
  imagesUsed: number;
  videosUsed: number;
}

export { DEFAULT_ASSISTANT_CONFIG, type AssistantConfig } from "./assistant-config";
