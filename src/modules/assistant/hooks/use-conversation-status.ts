
"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ConversationStatus, ChatMessage } from "../lib/types";
import { isConversationLive } from "../lib/types";
import { normalizeSystemMessageContent } from "./use-assistant-chat.utils";

interface UseConversationStatusOptions {
  sessionId: string;
  isOpen: boolean;
  hasConversation: boolean;
  conversationStatus: ConversationStatus;
  setConversationStatus: (status: ConversationStatus) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  closingByUserRef: React.RefObject<boolean>;
}

async function enrichStatusExtraFromApi(
  sessionId: string,
  status: ConversationStatus,
  extra?: { closedBy?: string; reason?: string; glpiTicketId?: number | string; specialistName?: string }
): Promise<{ closedBy?: string; reason?: string; glpiTicketId?: number | string; specialistName?: string }> {
  if (extra?.glpiTicketId || (status !== "handed_over" && status !== "paused" && status !== "closed")) {
    return extra || {};
  }

  try {
    const response = await fetch(`/api/assistant/conversations/${sessionId}/status`);
    if (!response.ok) return extra || {};

    const data = await response.json();
    return {
      ...(extra || {}),
      glpiTicketId: data.glpiTicketId || data.glpi_ticket_id,
      specialistName: extra?.specialistName || data.specialistName || data.specialist_name,
      closedBy: extra?.closedBy || data.closedBy,
      reason: extra?.reason || data.reason,
    };
  } catch {
    return extra || {};
  }
}

function buildStatusSystemMessage(
  newStatus: ConversationStatus,
  extra?: { closedBy?: string; reason?: string; glpiTicketId?: number | string; specialistName?: string }
): string | null {
  if (newStatus === "closed") {
    return null;
  }
  if (newStatus === "paused") {
    const reason = extra?.reason ? `: ${extra.reason}` : "";
    const ticketInfo = extra?.glpiTicketId ? `\nTu número de ticket es: #${extra.glpiTicketId}` : "";
    return `Conversación pausada${reason}. No puedes enviar mensajes hasta que sea retomada.${ticketInfo}`;
  }
  if (newStatus === "waiting_specialist") {
    return "Tu caso ha sido escalado a un especialista. Espera por favor.";
  }
  if (newStatus === "handed_over") {
    const specialistName = extra?.specialistName?.trim();
    if (specialistName) {
      return `La conversación fue tomada por el especialista: ${specialistName}.`;
    }
    return "La conversación fue tomada por un especialista.";
  }
  return null;
}

function appendSystemMessage(
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  content: string,
  prefix: string
) {
  const normalized = normalizeSystemMessageContent(content);

  setMessages((prev) => [
    ...prev,
    {
      id: `system-${prefix}-${Date.now()}`,
      role: "system" as const,
      content: normalized,
      timestamp: new Date(),
    },
  ]);
}

export function useConversationStatus({
  sessionId,
  isOpen,
  hasConversation,
  conversationStatus,
  setConversationStatus,
  setMessages,
  closingByUserRef,
}: UseConversationStatusOptions) {
  const sseConnectedRef = useRef(false);
  const lastStatusMessageRef = useRef<string | null>(null);

  const handleStatusChange = useCallback(
    (newStatus: ConversationStatus, extra?: { closedBy?: string; reason?: string; glpiTicketId?: number | string; specialistName?: string }) => {
      if (newStatus === "closed" && closingByUserRef.current) {
        closingByUserRef.current = false;
        setConversationStatus(newStatus);
        return;
      }

      if (newStatus === conversationStatus) {
        return;
      }

      setConversationStatus(newStatus);
      const message = buildStatusSystemMessage(newStatus, extra);
      if (message) {
        const fingerprint = `${newStatus}|${message}`;
        if (lastStatusMessageRef.current === fingerprint) {
          return;
        }
        lastStatusMessageRef.current = fingerprint;
        appendSystemMessage(setMessages, message, newStatus);
      }
    },
    [setConversationStatus, setMessages, closingByUserRef, conversationStatus]
  );

  useEffect(() => {
    if (!isOpen || !isConversationLive(conversationStatus)) return;
    if (!hasConversation) return;

    const url = `/api/assistant/conversations/${sessionId}/events`;
    let es: EventSource | null = null;

    try {
      es = new EventSource(url);

      es.addEventListener("status_changed", (e: MessageEvent) => {
        (async () => {
          try {
          const data = JSON.parse(e.data);
          const newStatus = data.status as ConversationStatus;
          if (!newStatus) return;

          sseConnectedRef.current = true;
          const enriched = await enrichStatusExtraFromApi(sessionId, newStatus, {
            closedBy: data.closedBy,
            reason: data.reason,
            glpiTicketId: data.glpiTicketId || data.glpi_ticket_id,
            specialistName: data.specialistName || data.specialist_name,
          });
          handleStatusChange(newStatus, enriched);
          } catch {
          }
        })();
      });

      es.addEventListener("new_message", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (!data.content) return;

          // IGNORAR ecos de mensajes del usuario (ya gestionados localmente)
          if (data.role === "user") {
            return;
          }

          if (data.role === "system") {
            appendSystemMessage(setMessages, data.content, "sse");
            return;
          }

          if (data.role === "model" || data.role === "assistant") {
            // DEDUPLICACIÓN: Evitar agregar el mensaje si ya está en el estado local 
            // (vía streaming o inserción manual previa al cerrar stream)
            setMessages((prev) => {
              const isAlreadyPresent = prev.some(
                (m) =>
                  (m.role === "assistant" && m.content === data.content.trim()) ||
                  (m.role === "assistant" && data.content.trim().startsWith(m.content) && m.content.length > 0)
              );

              if (isAlreadyPresent) return prev;

              return [
                ...prev,
                {
                  id: `sse-msg-${Date.now()}`,
                  role: "assistant" as const,
                  content: data.content,
                  timestamp: new Date(),
                },
              ];
            });
            return;
          }

          // Si es un rol desconocido que no es usuario ni asistente, lo tratamos como sistema
          appendSystemMessage(setMessages, data.content, "sse-unknown");
        } catch {
        }
      });

      es.addEventListener("message", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (!data.content && !data.message) return;
          const content = data.content || data.message;
          const role = data.role || "system";

          if (role === "model" || role === "assistant") {
            setMessages((prev) => [
              ...prev,
              {
                id: `sse-default-${Date.now()}`,
                role: "assistant" as const,
                content,
                timestamp: new Date(),
              },
            ]);
          } else {
            appendSystemMessage(setMessages, content, "sse-default");
          }
        } catch {
        }
      });

      es.onopen = () => {
        sseConnectedRef.current = true;
      };

      es.onerror = () => {
        sseConnectedRef.current = false;
      };
    } catch {
      sseConnectedRef.current = false;
    }

    return () => {
      es?.close();
      sseConnectedRef.current = false;
    };
  }, [isOpen, conversationStatus, sessionId, hasConversation, handleStatusChange, setMessages]);

  useEffect(() => {
    if (!isOpen || !isConversationLive(conversationStatus)) return;
    if (!hasConversation) return;

    const POLL_INTERVAL = 30_000;

    const pollStatus = async () => {
      if (sseConnectedRef.current) return;

      try {
        const response = await fetch(`/api/assistant/conversations/${sessionId}/status`);
        if (!response.ok) return;

        const data = await response.json();
        const newStatus = data.status as ConversationStatus;

        if (newStatus && newStatus !== conversationStatus) {
          handleStatusChange(newStatus, {
            closedBy: data.closedBy,
            reason: data.reason,
            glpiTicketId: data.glpiTicketId,
            specialistName: data.specialistName,
          });
        }
      } catch {
      }
    };

    const intervalId = setInterval(pollStatus, POLL_INTERVAL);
    return () => clearInterval(intervalId);
  }, [isOpen, conversationStatus, sessionId, hasConversation, handleStatusChange]);

  return { sseConnectedRef };
}
