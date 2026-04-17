import type { ModelMessage, TextPart, ImagePart } from "ai";
import type { MediaAttachment, ClientContextData, ConversationMessage } from "./types";


export interface ClientMessage {
  role: "user" | "assistant" | "system";
  content: string | Array<{ type: string; text?: string; image?: string; mimeType?: string }>;
  attachments?: MediaAttachment[];
}

export interface ChatRequestBody {
  messages: ClientMessage[];
  sessionId: string;
  clientData?: ClientContextData;
  config?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  loadHistoryOnly?: boolean;
}


export function processAttachments(
  content: string,
  attachments?: MediaAttachment[]
): (TextPart | ImagePart)[] {
  const parts: (TextPart | ImagePart)[] = [];

  if (content) {
    parts.push({ type: "text", text: content });
  }

  if (!attachments || attachments.length === 0) {
    return parts;
  }

  for (const attachment of attachments) {
    if (attachment.type === "image") {
      const base64 = attachment.url.split(",")[1] || attachment.url;
      parts.push({
        type: "image",
        image: base64,
        mimeType: attachment.mimeType,
      } as ImagePart);
    } else if (attachment.type === "video" && attachment.frames) {
      for (const frame of attachment.frames) {
        const base64 = frame.split(",")[1] || frame;
        parts.push({
          type: "image",
          image: base64,
          mimeType: "image/jpeg",
        } as ImagePart);
      }
    }
  }

  return parts;
}


export function convertToModelMessages(messages: ClientMessage[]): ModelMessage[] {
  return messages
    .filter((msg) => msg.role !== "system")
    .map((msg): ModelMessage => {
      if (msg.attachments && msg.attachments.length > 0 && msg.role === "user") {
        return {
          role: "user" as const,
          content: processAttachments(
            typeof msg.content === "string" ? msg.content : "",
            msg.attachments
          ),
        };
      }

      const messageContent =
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content);

      if (msg.role === "assistant") {
        return {
          role: "assistant" as const,
          content: messageContent,
        };
      }

      return {
        role: "user" as const,
        content: messageContent,
      };
    });
}

export function mergeWithHistory(
  frontendMessages: ModelMessage[],
  conversationHistory: ConversationMessage[]
): ModelMessage[] {
  if (conversationHistory.length === 0) {
    return frontendMessages;
  }

  if (frontendMessages.length === 1) {
    
    const historyMessages: ModelMessage[] = conversationHistory.map((msg): ModelMessage => ({
      role: msg.role === "model" ? "assistant" : msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    }));
    
    return [...historyMessages, ...frontendMessages];
  }

  return frontendMessages;
}


export function extractTextContent(message: ClientMessage): string {
  if (typeof message.content === "string") {
    return message.content;
  }
  
  const textPart = message.content.find(part => part.type === "text");
  return textPart?.text || JSON.stringify(message.content);
}

export function getLastUserMessage(messages: ClientMessage[]): ClientMessage | undefined {
  return [...messages].reverse().find(msg => msg.role === "user");
}
