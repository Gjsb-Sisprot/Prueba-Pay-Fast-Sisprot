
"use client";

import { useRef, useEffect, useState } from "react";
import { cn } from "@/shared/lib/utils";
import {
  X,
  LogOut,
  Wifi,
  MessageSquare,
  Lock,
  Plus
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/shared/components/ui/button";
import { useAssistantChat } from "@/modules/assistant/hooks/use-assistant-chat";
import { ChatMessage } from "@/modules/assistant/components/chat-message";
import { ChatInput } from "@/modules/assistant/components/chat-input";
import { ConversationsList } from "@/modules/assistant/components/conversations-list";
import { useClientStore } from "@/shared/lib/store/client-store";
import { canAccessAIAssistant } from "@/shared/lib/validation/ai-access-control";
import { DEFAULT_MEDIA_LIMITS, getStatusLabel } from "@/modules/assistant/lib/types";

function ThinkingIndicator() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="flex gap-2 w-full justify-start">
      <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden border border-gray-200">
        <Image
          src="/assets/images/assistant/susana.png"
          alt="Susana"
          width={28}
          height={28}
          className="w-full h-full object-cover"
          unoptimized
        />
      </div>
      <div className="max-w-[80%]">
        <div className="rounded-2xl px-4 py-3 text-sm bg-gray-100 text-gray-900 rounded-tl-sm flex items-center justify-center">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatBubble() {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedClient = useClientStore((state) => state.selectedClient);
  const selectedContract = useClientStore((state) => state.selectedContract);
  const contractsResponse = useClientStore((state) => state.contractsResult);

  const identification = selectedClient?.identification;
  const clientName = selectedClient
    ? `${selectedClient.name} ${selectedClient.last_name}`.trim()
    : undefined;
  const clientSector =
    selectedContract?.sector_name ||
    contractsResponse?.results?.[0]?.sector_name;

  const hasAccess = canAccessAIAssistant(identification);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
    isOpen,
    toggleChat,
    closeChat,
    pendingAttachments,
    addAttachment,
    removeAttachment,
    mediaUsage,
    inputRef,
    currentView,
    conversationStatus,
    canSendMessage,
    closeConversation,
    dismissCloseOffer,
    selectConversation,
    startNewConversation,
    showConversations,
    backToChat,
    sessionId,
    isFetchingContext,
    handleSelectDate,
  } = useAssistantChat({
    identification,
    clientName,
    clientSector,
    onError: () => {
    },
  });

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeChat();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, closeChat]);

  const handleAcceptPaymentOffer = async () => {
    // Primero cerramos la conversación de forma oficial (marcando el ticket como satisfecho)
    await closeConversation();
    
    // Cerramos el chat visualmente
    closeChat();
    
    // Desplazamos al usuario a la sección de pagos
    const el = document.getElementById("contracts-container");
    if (el) {
      el.classList.add("ring-4", "ring-green-500", "animate-pulse", "shadow-xl");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        el.classList.remove("ring-4", "ring-green-500", "animate-pulse", "shadow-xl");
      }, 5000);
    }
  };

  if (!hasAccess) {
    if (process.env.NODE_ENV === 'development') {
    }
    return null;
  }

  return (
    <>
      { }
      <button
        onClick={toggleChat}
        className={cn(
          "fixed bottom-4 right-4 z-50",
          "w-14 h-14 rounded-full shadow-lg",
          "bg-black text-white",
          "flex items-center justify-center",
          "transition-all duration-300 ease-out",
          "hover:scale-105 hover:shadow-xl",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black",
          isOpen && "scale-0 opacity-0 pointer-events-none",
        )}
        aria-label="Abrir asistente virtual"
      >
        <Image
          src="/assets/images/assistant/susana.png"
          alt="Sisprot Asistente"
          width={56}
          height={56}
          className="w-full h-full object-cover rounded-full"
          unoptimized
        />

        { }

        <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <Wifi className="w-3 h-3 text-white" />
        </span>
      </button>

      { }
      <div
        className={cn(
          "fixed z-50 transition-all duration-300 ease-out",
          "bottom-0 right-0 left-0 sm:left-auto",
          "sm:bottom-4 sm:right-4",
          "h-[85vh] sm:h-125",
          "w-full sm:w-95",
          isOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none",
        )}
      >
        <div className="flex flex-col h-full bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          { }
          <div className="flex items-center justify-between px-4 py-3 bg-black text-white rounded-t-2xl sm:rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 border border-white/20 rounded-full overflow-hidden">
                <Image
                  src="/assets/images/assistant/susana.png"
                  alt="Susana"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Susana </h3>
                <p className="text-xs text-gray-300">Asistente virtual</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {currentView === "chat" && (
                <>
                  { }
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={showConversations}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white"
                    title="Ver conversaciones"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  { }
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeConversation}
                    disabled={
                      messages.length <= 1 ||
                      isLoading ||
                      conversationStatus === "closed"
                    }
                    className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white disabled:opacity-40"
                    title="Finalizar conversación"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={closeChat}
                className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          { }
          {currentView === "conversations" ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <ConversationsList
                identification={identification}
                onSelectConversation={selectConversation}
                onNewConversation={startNewConversation}
                onBack={backToChat}
                activeSessionId={sessionId}
              />
            </div>
          ) : (
            <>
              { }
              {!canSendMessage && (
                <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-yellow-600" />
                  <span className="text-xs text-yellow-700">
                    Esta conversación está{" "}
                    {getStatusLabel(conversationStatus).toLowerCase()}.
                    {conversationStatus === "closed" && " Solo lectura."}
                  </span>
                </div>
              )}

              { }
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    attachments={message.attachments}
                    closeOffer={message.closeOffer}
                    paymentOffer={message.paymentOffer}
                    onCloseConversation={message.closeOffer ? closeConversation : undefined}
                    onDismissCloseOffer={message.closeOffer ? () => dismissCloseOffer(message.id) : undefined}
                    onAcceptPaymentOffer={message.paymentOffer ? handleAcceptPaymentOffer : undefined}
                    onSelectDate={handleSelectDate}
                    isStreaming={
                      isLoading &&
                      index === messages.length - 1 &&
                      message.role === "assistant" &&
                      message.content.length > 0
                    }
                  />
                ))}

                { }
                {isLoading &&
                  messages[messages.length - 1]?.role === "user" && (
                    <ThinkingIndicator />
                  )}

                {isFetchingContext && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-3">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                    </div>
                    <p className="text-xs italic">Consultando tus servicios en Sisprot...</p>
                  </div>
                )}

                { }
                {error && (
                  <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg">
                    <p className="font-medium">Error al procesar tu mensaje</p>
                    <p className="mt-1 text-red-500">{error.message}</p>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              { }
              <div className="p-3 border-t border-gray-100">
                {conversationStatus === "closed" ? (
                  <Button
                    onClick={startNewConversation}
                    className="w-full gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva conversación
                  </Button>
                ) : (
                  <>
                    <ChatInput
                      value={input}
                      onChange={handleInputChange}
                      onSubmit={handleSubmit}
                      isLoading={isLoading}
                      onStop={stop}
                      inputRef={inputRef}
                      pendingAttachments={pendingAttachments}
                      onAddAttachment={addAttachment}
                      onRemoveAttachment={removeAttachment}
                      mediaUsage={mediaUsage}
                      mediaLimits={DEFAULT_MEDIA_LIMITS}
                      placeholder={
                        canSendMessage
                          ? "Describe tu problema de conexión..."
                          : "Conversación finalizada"
                      }
                      disabled={!canSendMessage}
                    />
                    <p className="text-[10px] text-center text-gray-400 mt-2">
                      soporte tecnico onu + informacion
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      { }
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 sm:hidden"
          onClick={closeChat}
          aria-hidden="true"
        />
      )}
    </>
  );
}
