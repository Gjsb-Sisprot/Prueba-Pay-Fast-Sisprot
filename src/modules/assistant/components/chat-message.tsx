
"use client"

import * as React from "react";
import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { 
  User, 
  Video, 
  Maximize2, 
  Info, 
  LogOut, 
  MessageSquarePlus, 
  CreditCard, 
  X 
} from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import type { MediaAttachment } from "../lib/types";

interface ChatMessageProps {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  isLoading?: boolean;
  attachments?: MediaAttachment[];
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
          <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden border border-gray-200">
            <img src="/assets/images/assistant/susana.png" alt="Susana" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="max-w-[80%] flex flex-col gap-1">
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
                  onClick={() => {
                    if (attachment.type === "image") {
                      setExpandedImage(attachment.url);
                    }
                  }}
                >
                  {attachment.type === "image" ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
              <div className="prose prose-sm prose-gray max-w-none break-words [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:break-all [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-medium [&_h1]:my-2 [&_h2]:my-1.5 [&_h3]:my-1">
                <ReactMarkdown
                  components={{
                    img: ({ src, alt }) => {
                      const githubUrl = typeof src === 'string' ? src : "";
                      const isPlanResidencial = githubUrl.includes('/residenciales.png');
                      const isPlanPyme = githubUrl.includes('/pymes.png');
                      const isPlanImage = isPlanResidencial || isPlanPyme;
                      
                      if (isPlanImage) {
                        // Convertir la URL de GitHub (blob) a Raw URL para que cargue la imagen real
                        const rawSrc = githubUrl
                          .replace('github.com', 'raw.githubusercontent.com')
                          .replace('/blob/', '/');

                        return (
                          <span className="my-4 block w-full">
                            <span className="flex flex-col gap-0 bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden transition-all hover:shadow-lg">
                              <span className="flex items-center gap-3 p-3 bg-gray-50 border-b border-gray-100">
                                <span className="bg-blue-100 p-2 rounded-lg flex items-center justify-center">
                                  <CreditCard className="w-4 h-4 text-blue-600" />
                                </span>
                                <span className="flex-1">
                                  <span className="text-sm font-bold text-gray-900 block leading-tight">
                                    {isPlanResidencial ? "Plan Residencial" : "Plan PYME (Empresas)"}
                                  </span>
                                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Sisprot Global Fiber</span>
                                </span>
                              </span>
                              <span className="p-1 bg-white flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={rawSrc}
                                  alt={alt || "Oferta de planes"}
                                  className="w-full h-auto object-cover rounded-xl"
                                />
                              </span>
                              <a 
                                href={githubUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center justify-center gap-2 w-full p-2.5 text-xs font-semibold text-blue-700 bg-blue-50/50 hover:bg-blue-100 transition-colors border-t border-gray-100 no-underline decoration-0"
                              >
                                <Maximize2 className="w-3 h-3" /> Ver en pantalla completa
                              </a>
                            </span>
                          </span>
                        );
                      }

                      return (
                        <span className="block my-4 text-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={githubUrl}
                            alt={alt || "Imagen de Sisprot"}
                            className="rounded-xl shadow-lg border border-gray-100 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] max-w-full inline-block"
                          />
                          {alt && <span className="text-[10px] text-gray-400 mt-2 block font-medium">{alt}</span>}
                        </span>
                      );
                    },
                    a: ({ href, children, ...rest }) => {

                      const url = href || "";
                      const isMapLink = url.includes('maps.app.goo.gl') || url.includes('google.com/maps') || url.includes('goo.gl/maps');
                      
                      if (isMapLink) {
                        return (
                          <span className="my-3 block w-full">
                            <span className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                              <span className="flex-shrink-0 bg-red-50 p-2.5 rounded-full flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                                  <circle cx="12" cy="10" r="3"/>
                                </svg>
                              </span>
                              <span className="flex-1 min-w-0 flex flex-col justify-center">
                                <span className="text-sm font-semibold text-gray-900 m-0 leading-tight block">Ubicación Sisprot</span>
                                <span className="text-xs text-gray-500 leading-snug mt-0.5 mb-2 truncate block">Oficina Principal</span>
                                <a 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="inline-flex items-center justify-center w-full px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm focus:outline-none no-underline transition-colors decoration-0"
                                >
                                  Guiarme con el mapa
                                </a>
                              </span>
                            </span>
                          </span>
                        );
                      }
                      return (
                        <a
                          {...rest}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline hover:text-primary/80 break-all"
                        >
                          {children}
                        </a>
                      );
                    },
                    p: ({ children }) => <p className="my-1">{children}</p>,
                  }}
                >
                  {content}
                </ReactMarkdown>
                {isStreaming && content && (
                  <span className="inline-block w-1.5 h-4 bg-gray-400/70 rounded-[1px] animate-pulse align-text-bottom ml-0.5" />
                )}
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words">{content}</div>
            )}
          </div>
          
          {showCloseOffer && (
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCloseConversation?.()}
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

          {showPaymentOffer && (
            <div className="flex gap-2 mt-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setPaymentOfferDismissed(true);
                  onAcceptPaymentOffer?.();
                }}
                className="h-7 px-3 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              >
                <CreditCard className="w-3 h-3" />
                Quiero pagar
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

      {expandedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
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


