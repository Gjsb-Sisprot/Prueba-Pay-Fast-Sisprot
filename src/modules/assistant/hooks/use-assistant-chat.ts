
"use client";

import {
  useCallback,
  useState,
  useRef,
  useEffect,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  DEFAULT_ASSISTANT_CONFIG,
  DEFAULT_MEDIA_LIMITS,
  type ChatMessage,
  type ClientContextData,
  type Conversation,
  type ConversationStatus,
  canSendMessages,
} from "../lib/types";
import { useConversationStatus } from "./use-conversation-status";
import { useMediaAttachments } from "./use-media-attachments";
import {
  generateSessionId,
  generateMessageId,
  buildAssistantStreamPatch,
  mapHistoryToMessages,
  normalizeSystemMessageContent,
  CLOSE_CHAT_MARKER,
} from "./use-assistant-chat.utils";

interface UseAssistantChatOptions {
  config?: Partial<typeof DEFAULT_ASSISTANT_CONFIG>;
  onError?: (error: Error) => void;
  initialMessage?: string;
  identification?: string;
  clientName?: string;
  clientSector?: string;
}

type ChatView = "chat" | "conversations";

export function useAssistantChat(options: UseAssistantChatOptions = {}) {
  const { config, onError, identification } = options;

  const [sessionId, setSessionId] = useState(() => generateSessionId());

  const [mcpClientData, setMcpClientData] = useState<ClientContextData | undefined>(undefined);
  const [isFetchingContext, setIsFetchingContext] = useState(false);

  const [conversationStatus, setConversationStatus] = useState<ConversationStatus>("active");
  const [currentView, setCurrentView] = useState<ChatView>("chat");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const closingByUserRef = useRef(false);

  const media = useMediaAttachments();

  const hasConversation = messages.length > 1 || (messages.length === 1 && messages[0]?.id !== "welcome");
  useConversationStatus({
    sessionId,
    isOpen,
    hasConversation,
    conversationStatus,
    setConversationStatus,
    setMessages,
    closingByUserRef,
  });

  useEffect(() => {
    if (!identification) {
      setMcpClientData(undefined);
      return;
    }

    let cancelled = false;
    setIsFetchingContext(true);

    fetch(`/api/assistant/client-context?identification=${encodeURIComponent(identification)}`)
      .then((res) => res.json())
      .then((response) => {
        if (cancelled) return;
        if (response.success && response.data) {
          setMcpClientData(response.data);
          console.log("[ASSISTANT_DEBUG] Client Data loaded:", { name: response.data.name, contracts: response.data.totalContracts });

          // Saludo proactivo si es una conversación nueva
          setMessages(prev => {
            if (prev.length === 0) {
              const fullName = response.data.name || options.clientName || "";
              const firstName = fullName.trim().split(/\s+/)[0] || "";

              return [{
                id: "welcome",
                role: "assistant",
                content: `¡Hola${firstName ? ` ${firstName}` : ""}! Soy Susana, tu asistente virtual de Sisprot. ¿En qué puedo ayudarte hoy? 🚀`,
                timestamp: new Date()
              }];
            }
            return prev;
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
        }
      })
      .finally(() => {
        if (!cancelled) setIsFetchingContext(false);
      });

    return () => { cancelled = true; };
  }, [identification, options.clientName]);


  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);
  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);

  const sendMessage = useCallback(
    async (content: string) => {
      // Si estamos cargando el contexto inicial (solo al principio), esperamos.
      if (isFetchingContext && messages.length === 0) {
        // Reintentamos en 500ms hasta que esté listo.
        setTimeout(() => sendMessage(content), 500);
        return;
      }

      if ((!content.trim() && media.pendingAttachments.length === 0) && !isLoading) {
        // Permitir mensajes vacíos solo para inicialización automática
        if (messages.length > 0) return;
      }

      if (isLoading) return;

      const attachments = media.consumeAttachments();

      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);
      setError(undefined);

      abortControllerRef.current = new AbortController();

      try {
        const payload = {
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          sessionId,
          clientData: mcpClientData || (identification ? { identification } : undefined),
          config: { ...DEFAULT_ASSISTANT_CONFIG, ...config },
        };

        const response = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const wasRetried = response.headers.get("X-Retried") === "true";
        if (wasRetried) {
          setMessages((prev) => [
            ...prev,
            {
              id: generateMessageId(),
              role: "system",
              content: "El modelo principal experimenta alto tráfico. Se usó un modelo alternativo.",
              timestamp: new Date(),
            },
          ]);
        }

        const assistantMessageId = generateMessageId();
        setMessages((prev) => [
          ...prev,
          { id: assistantMessageId, role: "assistant", content: "", timestamp: new Date() },
        ]);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            assistantContent += decoder.decode(value, { stream: true });
            const patch = buildAssistantStreamPatch(assistantContent, {
              isPortalAuthenticated: Boolean(mcpClientData?.identification || identification),
            });
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? {
                    ...m,
                    role: patch.role,
                    content: patch.content,
                    closeOffer: patch.closeOffer,
                    paymentOffer: patch.paymentOffer,
                  }
                  : m
              )
            );
          }
        }

        // Si detectamos el marcador de cierre automático (por escalamiento a especialista)
        if (assistantContent.includes(CLOSE_CHAT_MARKER)) {
          setTimeout(() => {
            if (!closingByUserRef.current) {
              closeChat();
            }
          }, 6000); // 6 segundos para que el usuario pueda leer su número de ticket
        }

        if (!assistantContent.trim()) {
          const fallbackMessage = "Disculpa, no pude procesar tu mensaje en este momento. ¿Podrías intentar de nuevo o reformular tu pregunta?";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: fallbackMessage } : m
            )
          );
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        const error = err instanceof Error ? err : new Error("Error desconocido");
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [messages, config, onError, isLoading, sessionId, mcpClientData, media, identification, closeChat, isFetchingContext]
  );

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage]
  );

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(undefined);
    media.resetMediaUsage();
  }, [media]);

  const closeConversation = useCallback(async () => {
    if (!sessionId) return;
    try {
      setIsLoading(true);
      closingByUserRef.current = true;
      const userMessages = messages.filter(m => m.role === "user");
      const topics = userMessages.slice(0, 3).map(m => m.content.substring(0, 30)).join(", ");
      const summary = `Temas: ${topics || "Conversaci\u00f3n breve"}`;

      const response = await fetch(`/api/assistant/conversations/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "close",
          summary,
          resolution: "Conversaci\u00f3n cerrada por el usuario",
        }),
      });

      const closeData = await response.json().catch(() => null);

      if (response.ok) {
        setConversationStatus("closed");
        const closeMessage =
          typeof closeData?.closeMessage === "string" && closeData.closeMessage.trim()
            ? closeData.closeMessage.trim()
            : "\u00a1Gracias por contactarnos! He cerrado la conversaci\u00f3n. Antes de irte, recuerda visitar las redes oficiales de Sisprot, su canal de YouTube y WhatsApp para novedades y soporte.";

        const ticketMessage =
          typeof closeData?.ticketMessage === "string" && closeData.ticketMessage.trim()
            ? normalizeSystemMessageContent(closeData.ticketMessage)
            : null;

        setMessages(prev => [
          ...prev.map(m => ({ ...m, closeOffer: false })),
          {
            id: generateMessageId(),
            role: "assistant" as const,
            content: closeMessage,
            timestamp: new Date(),
          },
          ...(ticketMessage ? [{
            id: generateMessageId(),
            role: "system" as const,
            content: ticketMessage,
            timestamp: new Date(),
          }] : []),
        ]);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, messages]);

  const dismissCloseOffer = useCallback((messageId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, closeOffer: false } : m
    ));
    inputRef.current?.focus();
  }, []);

  const selectConversation = useCallback(async (conversation: Conversation) => {
    setSessionId(conversation.sessionId);
    setConversationStatus(conversation.status);
    setCurrentView("chat");
    setIsLoading(true);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [],
          sessionId: conversation.sessionId,
          clientData: mcpClientData,
          loadHistoryOnly: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.history?.length > 0) {
          const loadedMessages: ChatMessage[] = mapHistoryToMessages(data.history);
          setMessages(loadedMessages);
          setIsHistoryLoaded(true);
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [mcpClientData]);

  const startNewConversation = useCallback(() => {
    setSessionId(generateSessionId());
    setConversationStatus("active");
    clearMessages();
    setIsHistoryLoaded(false);
    setCurrentView("chat");
  }, [clearMessages]);

  const showConversations = useCallback(() => setCurrentView("conversations"), []);
  const backToChat = useCallback(() => setCurrentView("chat"), []);

  const reload = useCallback(() => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMessage) {
      setMessages((prev) => {
        const lastIndex = prev.length - 1;
        if (prev[lastIndex]?.role === "assistant" && prev[lastIndex]?.id !== "welcome") {
          return prev.slice(0, lastIndex);
        }
        return prev;
      });
      sendMessage(lastUserMessage.content);
    }
  }, [messages, sendMessage]);


  return {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    sessionId,

    sendMessage,
    clearMessages,
    reload,
    stop,

    isOpen,
    toggleChat,
    openChat,
    closeChat,

    pendingAttachments: media.pendingAttachments,
    addAttachment: media.addAttachment,
    removeAttachment: media.removeAttachment,
    clearAttachments: media.clearAttachments,
    mediaUsage: media.mediaUsage,
    mediaLimits: DEFAULT_MEDIA_LIMITS,

    inputRef,

    currentView,
    conversationStatus,
    canSendMessage: canSendMessages(conversationStatus),
    closeConversation,
    dismissCloseOffer,
    selectConversation,
    startNewConversation,
    showConversations,
    backToChat,
    isHistoryLoaded,

    mcpClientData,
    isFetchingContext,
  };
}
