
"use client";

import { cn } from "@/shared/lib/utils";
import { Bot, User, Video, Maximize2, RotateCcw, Info, LogOut, MessageSquarePlus, CreditCard, X } from "lucide-react";
import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { MediaAttachment } from "../lib/types";
import { Button } from "@/shared/components/ui/button";

interface ChatMessageProps {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  isLoading?: boolean;
  attachments?: MediaAttachment[];
  onReload?: () => void;
  closeOffer?: boolean;
  paymentOffer?: boolean;
  onCloseConversation?: () => void;
  onDismissCloseOffer?: () => void;
  onAcceptPaymentOffer?: () => void;
  isStreaming?: boolean;
}

function ChatMessageComponent({
  role,
  content,
  isLoading,
  attachments,
  onReload,
  closeOffer,
  paymentOffer,
  onCloseConversation,
  onDismissCloseOffer,
  onAcceptPaymentOffer,
  isStreaming,
}: ChatMessageProps) {
  const isAssistant = role === "assistant";
  const isToolResult = role === "tool";
  const isSystem = role === "system";
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [offerDismissed, setOfferDismissed] = useState(false);
  const [paymentOfferDismissed, setPaymentOfferDismissed] = useState(false);

  const showCloseOffer = closeOffer && !offerDismissed && onCloseConversation;
  const showPaymentOffer = paymentOffer && !paymentOfferDismissed && onAcceptPaymentOffer;

  if (isToolResult) {
    return null;
  }

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 border-dashed">
          <Info className="w-3 h-3 text-gray-400 shrink-0" />
          <span className="text-[11px] text-gray-500 text-center">{content}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "flex gap-2 w-full",
          isAssistant ? "justify-start" : "justify-end"
        )}
      >
        {isAssistant && (
          <div className="shrink-0 w-7 h-7 rounded-full bg-black flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
        )}

        <div className="max-w-[80%] flex flex-col gap-1">
          { }
          {attachments && attachments.length > 0 && (
            <div
              className={cn(
                "flex flex-wrap gap-1",
                isAssistant ? "justify-start" : "justify-end"
              )}
            >
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="relative group w-20 h-20 rounded-lg overflow-hidden cursor-pointer"
                  onClick={() =>
                    attachment.type === "image" &&
                    setExpandedImage(attachment.url)
                  }
                >
                  {attachment.type === "image" ? (
                    <>
                      { }
                      <img
                        src={attachment.url}
                        alt="Archivo adjunto"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-700 text-white">
                      <Video className="w-6 h-6" />
                      {attachment.duration && (
                        <span className="text-[10px] mt-1">
                          {attachment.duration.toFixed(1)}s
                        </span>
                      )}
                      {attachment.frameCount && (
                        <span className="text-[9px] text-gray-300">
                          {attachment.frameCount} frames
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          { }
          <div
            className={cn(
              "rounded-2xl px-3 py-2 text-sm overflow-hidden",
              isAssistant
                ? "bg-gray-100 text-gray-900 rounded-tl-sm"
                : "bg-black text-white rounded-tr-sm"
            )}
          >
            {isLoading ? (
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              </div>
            ) : isAssistant ? (
              <div className="prose prose-sm prose-gray max-w-none wrap-anywhere [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:break-all [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-medium [&_h1]:my-2 [&_h2]:my-1.5 [&_h3]:my-1">
                <ReactMarkdown
                  components={{
                    a: ({ href, children }) => {
                      if (href && (href.includes('maps.app.goo.gl') || href.includes('google.com/maps'))) {
                        return (
                          <div className="my-3 block w-full">
                            <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                              <div className="flex-shrink-0 bg-red-50 p-2.5 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className="text-sm font-semibold text-gray-900 m-0 leading-tight">Ubicación Sisprot</p>
                                <p className="text-xs text-gray-500 leading-snug mt-0.5 mb-2 truncate">Oficina Principal</p>
                                <a 
                                  href={href} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="inline-flex items-center justify-center w-full px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm focus:outline-none no-underline transition-colors"
                                >
                                  Guiarme con el mapa
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline hover:text-primary/80 break-all"
                        >
                          {children}
                        </a>
                      );
                    },
                    p: ({ children }: any) => <p className="my-1">{children}</p>,
                  }}
                >
                  {content}
                </ReactMarkdown>
                {isStreaming && content && (
                  <span className="inline-block w-1.5 h-4 bg-gray-400/70 rounded-[1px] animate-pulse align-text-bottom ml-0.5" />
                )}
              </div>
            ) : (
              <div className="whitespace-pre-wrap wrap-anywhere">{content}</div>
            )}
          </div>
          
          { }
          { }

          { }
          {showCloseOffer && (
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCloseConversation}
                className="h-7 px-3 text-xs gap-1.5 border-gray-300 hover:bg-gray-50"
              >
                <LogOut className="w-3 h-3" />
                Cerrar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOfferDismissed(true);
                  onDismissCloseOffer?.();
                }}
                className="h-7 px-3 text-xs gap-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <MessageSquarePlus className="w-3 h-3" />
                Continuar
              </Button>
            </div>
          )}

          { }
          {showPaymentOffer && (
            <div className="flex gap-2 mt-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setPaymentOfferDismissed(true);
                  onAcceptPaymentOffer();
                }}
                className="h-7 px-3 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              >
                <CreditCard className="w-3 h-3" />
                Ir a Pagar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPaymentOfferDismissed(true);
                }}
                className="h-7 px-3 text-xs gap-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-3 h-3" />
                Descartar
              </Button>
            </div>
          )}
        </div>

        {!isAssistant && (
          <div className="shrink-0 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
        )}
      </div>

      { }
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-100 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          { }
          <img
            src={expandedImage}
            alt="Imagen expandida"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}

export const ChatMessage = memo(ChatMessageComponent);
