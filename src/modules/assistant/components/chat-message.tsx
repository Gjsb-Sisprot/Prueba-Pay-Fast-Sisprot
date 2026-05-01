
"use client";

import * as React from "react";
import { memo, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { 
  User, 
  Video, 
  Maximize2, 
  Info, 
  LogOut, 
  MessageSquarePlus, 
  CreditCard, 
  X,
  Building2,
  Paperclip,
  FileText,
  Landmark,
  UploadCloud,
  Volume2,
  VolumeX,
  Star
} from "lucide-react";
import Image from "next/image";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import type { MediaAttachment, ClientContextData, ChatMessage as AssistantChatMessage } from "../lib/types";
import { Calendar as CalendarIcon, MapPin, Info as InfoIcon } from "lucide-react";
import { es } from "date-fns/locale";
import { format } from "date-fns";

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
  onSelectDate?: (date: Date) => void;
  onSelectTime?: (time: string) => void;
  onSelectContract?: (contractId: string, sector: string, intent?: "admin" | "tech") => void;
  clientData?: ClientContextData; 
  messages?: AssistantChatMessage[]; 
  isStreaming?: boolean;
  occupiedSlots?: string[];
  onAddAttachment?: (file: File) => Promise<{ success: boolean; error?: string }>;
  pendingAttachments?: MediaAttachment[];
  onRemoveAttachment?: (id: string) => void;
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
  onSelectDate,
  onSelectTime,
  onSelectContract,
  clientData,
  messages = [],
  isStreaming,
  occupiedSlots = [],
  pendingAttachments = [],
  onRemoveAttachment,
}: ChatMessageProps) {
  const isAssistant = role === "assistant";
  const isToolResult = role === "tool";
  const isSystem = role === "system";
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [offerDismissed, setOfferDismissed] = useState(false);
  const [paymentOfferDismissed, setPaymentOfferDismissed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const cleanContent = (text: string) => {
    // Si el texto parece ser un objeto JSON de sistema, lo limpiamos, 
    // pero si es texto normal (ej: "Hola"), lo dejamos pasar.
    const technicalPatterns = [
      /__CALENDAR_ACTION__/gi,
      /__PAYMENT_ACTION__/gi,
      /__SELECT_CONTRACT(?:_ADMIN|_TECH)?__/gi,
      /__SELECT_TIME__/gi,
      /__SELECT_ISSUE_TYPE__/gi,
      /__REFUND_FORM__/gi,
      /__CANCELLATION_FORM__/gi,
      /__REACTIVATION_FORM__/gi,
      /__PLAN_CHANGE_FORM__/gi,
      /__PLAN_BUDGET_INFO__/gi,
      /__SIGNED_DOCUMENT_FORM__/gi,
      /__PLAN_PAYMENT_FORM__/gi,
      /__ZELLE_BINANCE_FORM__/gi,
      /__CLOSE_CHAT__/gi,
      /CLOSE_OFFER/gi,
      /CLOSE_CHAT/gi,
      // Catch tokens without underscores just in case
      /PLAN_PAYMENT_FORM/gi,
      /ZELLE_BINANCE_FORM/gi,
      /PLAN_CHANGE_FORM/gi,
      /__SATISFACTION_SURVEY__/gi
    ];

    let cleaned = text;
    technicalPatterns.forEach(p => { cleaned = cleaned.replace(p, ""); });

    return cleaned
      // Eliminar fugas de JSON crudo - Menos agresivo para no borrar texto legítimo
      .replace(/\[\s*\{\s*"content":[\s\S]*?\}\s*\}\s*\]/g, "") 
      .replace(/\{\s*"content":\s*\[[\s\S]*?\}\s*\}/g, "")
      .replace(/\{\s*"success":\s*true[\s\S]*?\}\}/g, "") 
      .replace(/\{\s*"glpiTicketId"[\s\S]*?\}\}/g, "")
      .replace(/\{?"content":\s*\[\s*\{"type":"text","text":"[\s\S]*?\}\s*\]\s*\}?/g, "")
      .trim();
  };

  const toggleSpeech = (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanedText = cleanContent(text);
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = "es-ES";
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    utteranceRef.current = utterance;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Segmentar el contenido por doble salto de línea para crear múltiples burbujas (solo para el asistente/bot)
  const segments = isAssistant 
    ? (() => {
        const rawSegments = content.split("\n\n")
          .map(s => s.trim())
          .map(s => ({ original: s, cleaned: cleanContent(s) }))
          .filter(seg => seg.cleaned.length > 0); // Permitir burbujas cortas ("Ok", "Si")

        const seenNorm = new Set<string>();
        return rawSegments.filter(seg => {
          // Normalización extrema para comparación: sin puntuación, sin espacios extra
          const norm = seg.cleaned.toLowerCase()
            .replace(/[.,!?;:]/g, "")
            .replace(/\s+/g, " ")
            .trim();
          
          if (norm.length < 5) return true; // Si es muy corto (ej: "Ok"), dejarlo pasar
          if (seenNorm.has(norm)) return false;
          seenNorm.add(norm);
          return true;
        }).map(seg => seg.original);
      })()
    : [content];

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
            <Image
              src="/assets/images/assistant/susana.png"
              alt="Susana"
              width={28}
              height={28}
              className="w-full h-full object-cover"
              unoptimized
            />
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
              {attachments.filter(a => a.type !== "file").map((attachment) => (
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
                      <Image
                        src={attachment.url}
                        alt="Archivo adjunto"
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                        unoptimized
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

          <div className="flex flex-col gap-1.5">
            {isLoading && segments.length === 0 ? (
              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2 text-sm bg-gray-100 text-gray-900 rounded-tl-sm w-fit"
                )}
              >
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                </div>
              </div>
            ) : (
              segments.map((segment, segmentIndex) => (
                <div
                  key={segmentIndex}
                  className={cn(
                    "rounded-2xl px-3.5 py-2 text-sm overflow-hidden transition-all duration-300",
                    isAssistant
                      ? "bg-gray-100 text-gray-900"
                      : "bg-black text-white rounded-tr-sm",
                    isAssistant && segments.length > 1 && (
                      segmentIndex === 0 
                        ? "rounded-tl-sm rounded-bl-md" 
                        : segmentIndex === segments.length - 1 
                          ? "rounded-tl-md rounded-bl-sm"
                          : "rounded-l-md"
                    ),
                    isAssistant && segments.length === 1 && "rounded-tl-sm",
                    "relative group/bubble"
                  )}
                >
                  {isAssistant && (
                    <button
                      onClick={() => toggleSpeech(segment)}
                      className={cn(
                        "absolute top-1 right-1 p-1 rounded-full bg-white/50 opacity-0 group-hover/bubble:opacity-100 transition-opacity",
                        isSpeaking && "opacity-100 text-blue-600 bg-white"
                      )}
                      title={isSpeaking ? "Detener" : "Escuchar mensaje"}
                    >
                      {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                  )}
                  {isAssistant ? (
                    <div className="prose prose-sm prose-gray max-w-none break-words [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:break-all [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-medium [&_h1]:my-2 [&_h2]:my-1.5 [&_h3]:my-1">
                      <ReactMarkdown
                        components={{
                          img: ({ src, alt }) => {
                            const githubUrl = typeof src === 'string' ? src : "";
                            const isPlanResidencial = githubUrl.includes('/residenciales.png');
                            const isPlanPyme = githubUrl.includes('/pymes.png');
                            const isPlanImage = isPlanResidencial || isPlanPyme;
                            
                            if (isPlanImage) {
                              const rawSrc = githubUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
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
                                      <Image src={rawSrc} alt={alt || "Oferta de planes"} width={400} height={300} className="w-full h-auto object-cover rounded-xl" unoptimized />
                                    </span>
                                    <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full p-2.5 text-xs font-semibold text-blue-700 bg-blue-50/50 hover:bg-blue-100 transition-colors border-t border-gray-100 no-underline decoration-0">
                                      <Maximize2 className="w-3 h-3" /> Ver en pantalla completa
                                    </a>
                                  </span>
                                </span>
                              );
                            }
                            return (
                              <span className="block my-4 text-center">
                                <Image src={githubUrl} alt={alt || "Imagen de Sisprot"} width={500} height={300} className="rounded-xl shadow-lg border border-gray-100 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] max-w-full inline-block" unoptimized />
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
                                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                                      </svg>
                                    </span>
                                    <span className="flex-1 min-w-0 flex flex-col justify-center">
                                      <span className="text-sm font-semibold text-gray-900 m-0 leading-tight block">Ubicación Sisprot</span>
                                      <span className="text-xs text-gray-500 leading-snug mt-0.5 mb-2 truncate block">Oficina Principal</span>
                                      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-full px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm focus:outline-none no-underline transition-colors decoration-0">Guiarme con el mapa</a>
                                    </span>
                                  </span>
                                </span>
                              );
                            }
                            return (
                              <a {...rest} href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 break-all">{children}</a>
                            );
                          },
                          p: ({ children }) => <p className="my-1">{children}</p>,
                        }}
                      >
                        {cleanContent(segment)}
                      </ReactMarkdown>
                      {isStreaming && segmentIndex === segments.length - 1 && segment && (
                        <span className="inline-block w-1.5 h-4 bg-gray-400/70 rounded-[1px] animate-pulse align-text-bottom ml-0.5" />
                      )}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words text-sm">
                      {cleanContent(segment)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          
          {isAssistant && content.includes("__SELECT_CONTRACT__") && !isLoading && (
            <div className="mt-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">¿Con qué contrato deseas continuar?</h4>
                  <p className="text-[10px] text-gray-500">Selecciona el servicio para el cual necesitas ayuda</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                {clientData?.allContracts?.map((c) => (
                  <Button
                    key={c.contractId}
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-2.5 px-3 border-blue-50 hover:bg-blue-50 hover:border-blue-200 transition-all text-left bg-blue-50/10"
                    onClick={() => {
                      const intent = content.includes("__SELECT_CONTRACT:ADMIN__") ? "admin" 
                        : content.includes("__SELECT_CONTRACT:TECH__") ? "tech" 
                        : undefined;
                      onSelectContract?.(String(c.contractId), c.sector, intent);
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-medium text-blue-900 leading-tight">
                        {c.sector}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {c.planName} • #{c.contractId}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {isAssistant && content.includes("__SELECT_TIME__") && !isLoading && (
            <div className="mt-3 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Header con Fecha (Extraída del historial) */}
              <div className="bg-gray-50 border-b border-gray-100 p-4">
                {(() => {
                  // Intentar encontrar el mensaje donde el usuario confirmó la fecha
                  const dateMsg = messages.findLast(m => m.role === 'user' && m.content.toLowerCase().includes('disponibilidad para la visita es el día'));
                  let displayDay = "Día seleccionado";
                  let displayFullDate = "Cargando fecha...";
                  
                  if (dateMsg) {
                    const match = dateMsg.content.match(/día\s+(.+)$/i);
                    if (match && match[1]) {
                      const dateStr = match[1].trim(); // ej: "jueves 16 de abril"
                      displayDay = dateStr.split(' ')[0] || "Seleccionado";
                      displayFullDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
                    }
                  } else if (clientData?.visitDate) {
                    const d = new Date(clientData.visitDate);
                    displayDay = format(d, 'eeee', { locale: es });
                    displayFullDate = format(d, "d 'de' MMMM, yyyy", { locale: es });
                  }

                  return (
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{displayDay}</p>
                      <h4 className="text-sm font-bold text-gray-900">{displayFullDate}</h4>
                    </div>
                  );
                })()}
              </div>

              <div className="p-4 space-y-4">
                {/* Zona Horaria */}
                <div className="flex items-center gap-2 text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium leading-tight">Zona horaria</span>
                    <span className="text-[11px] text-gray-400">GMT-04:00 America/Caracas (GMT-4)</span>
                  </div>
                </div>

                {/* Título de selección */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Seleccionar Ventana de tiempo</h3>
                  <p className="text-[10px] text-gray-500">Duración estimada: 90 minutos</p>
                </div>

                {/* Lista de Horas (Vertical) */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {(() => {
                    // Generar slots basados en las reglas de Susana
                    // Sáb/Dom: 8am-8pm | Lun/Vie: 8am-5pm y 5pm-8pm
                    const slots = [];
                    const startHour = 8;
                    const endHour = 20;
                    for (let m = startHour * 60; m < endHour * 60; m += 90) {
                      const h = Math.floor(m / 60);
                      const min = m % 60;
                      const ampm = h >= 12 ? "PM" : "AM";
                      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
                      const timeStr = `${displayHour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} ${ampm}`;
                      slots.push(timeStr);
                    }

                    return slots.map((time) => {
                      const isOccupied = occupiedSlots.includes(time);
                      return (
                        <Button
                          key={time}
                          variant="outline"
                          disabled={isOccupied}
                          className={cn(
                            "w-full justify-center h-12 text-sm font-bold border-gray-200 transition-all rounded-lg",
                            isOccupied 
                              ? "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed" 
                              : "hover:border-gray-900 hover:bg-gray-50 bg-white"
                          )}
                          onClick={() => onSelectTime?.(time)}
                        >
                          {time} {isOccupied && <span className="ml-2 text-[10px] font-normal uppercase">(Ocupado)</span>}
                        </Button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}

          {isAssistant && content.includes("__CALENDAR_ACTION__") && !isLoading && (
            <div className="mt-3 bg-white border border-gray-200 rounded-xl p-3 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-900">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <span>Seleccionar fecha de visita</span>
              </div>
              <div className="flex justify-center bg-gray-50 rounded-lg p-2 border border-gray-100">
                <Calendar
                  mode="single"
                  selected={undefined}
                  onSelect={(date) => {
                    if (date && onSelectDate) {
                      onSelectDate(date);
                    }
                  }}
                  disabled={(date) => {
                    const now = new Date();
                    const justDate = new Date();
                    justDate.setHours(0, 0, 0, 0);
                    
                    // Bloquear días pasados
                    if (date < justDate) return true;
                    
                    // Bloquear hoy si ya han pasado las 8:00 PM (20:00)
                    if (date.getTime() === justDate.getTime() && now.getHours() >= 20) return true;
                    
                    return false; // Disponible de Lunes a Domingo
                  }}
                  initialFocus
                  locale={es}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-2 text-center italic">
                Disponible de Lunes a Domingo
              </p>
            </div>
          )}

          {isAssistant && content.includes("__SELECT_ISSUE_TYPE__") && !isLoading && (
            <div className="mt-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <InfoIcon className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">¿Qué deseas realizar?</h4>
                  <p className="text-[10px] text-gray-500">Selecciona el tipo de gestión para tu servicio</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 px-3 border-blue-100 hover:bg-blue-50 hover:border-blue-300 transition-all text-left bg-blue-50/20"
                  onClick={() => onSelectContract?.("N/A", "Soporte Técnico")}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-bold text-blue-900 leading-tight">Soporte Técnico 🔧</span>
                    <span className="text-[10px] text-gray-500">Problemas de internet, TV o equipos</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 px-3 border-gray-100 hover:bg-gray-50 hover:border-gray-300 transition-all text-left bg-gray-50/20"
                  onClick={() => onSelectContract?.("N/A", "Gestión Administrativa")}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-bold text-gray-900 leading-tight">Gestión Administrativa 💰</span>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-500 leading-tight">Pagos, facturación, planes y deudas</span>
                      <span className="text-[10px] text-gray-500 leading-tight">Devoluciones, cambios de planes y ciclos</span>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {isAssistant && content.includes("__REFUND_FORM__") && !isLoading && (
            <div className="mt-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 leading-tight">Formulario de Reembolso</h4>
                  <p className="text-[10px] text-gray-500">Completa los datos para procesar tu solicitud</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Monto Pagado</label>
                    <input type="text" placeholder="Ej: 50$ o 1800 Bs" className="text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:border-blue-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Fecha</label>
                      <input type="text" placeholder="DD/MM/AAAA" className="text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:border-blue-200" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Referencia</label>
                      <input type="text" placeholder="Mín 6-8 dígitos" className="text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:border-blue-200" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Banco Destino</label>
                    <select className="text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:border-blue-200 appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em]">
                      <option>Seleccionar banco...</option>
                      <option>Banco de Venezuela (Sisprot)</option>
                      <option>Banesco (Sisprot)</option>
                      <option>Mercantil (Sisprot)</option>
                      <option>Pago Móvil (Sisprot)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Motivo del Error</label>
                    <select className="text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:border-blue-200 appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em]">
                      <option>Seleccionar motivo...</option>
                      <option>Pago duplicado</option>
                      <option>Excedente en el pago</option>
                      <option>Cuenta errada</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="text-[10px] uppercase font-bold text-gray-400 ml-1 block mb-1">Comprobante (Solo PDF)</label>
                  
                  {pendingAttachments.some(a => a.mimeType === 'application/pdf' || a.type === 'file') ? (
                    <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-xl animate-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-blue-900 truncate max-w-[150px]">
                            {pendingAttachments.find(a => a.mimeType === 'application/pdf' || a.type === 'file')?.fileName || 'comprobante.pdf'}
                          </span>
                          <span className="text-[10px] text-blue-400">Listo para enviar</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const pdf = pendingAttachments.find(a => a.mimeType === 'application/pdf' || a.type === 'file');
                          if (pdf && onRemoveAttachment) onRemoveAttachment(pdf.id);
                        }}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      type="button"
                      className="w-full h-14 border-dashed border-2 border-blue-100 bg-blue-50/20 hover:bg-blue-50 hover:border-blue-300 group transition-all rounded-xl flex flex-col items-center justify-center gap-0.5 shadow-none"
                      onClick={() => {
                        const realInput = document.querySelector('input[type="file"][accept*="pdf"]') as HTMLInputElement;
                        if (realInput) {
                          realInput.click();
                        } else {
                          alert("Por favor, usa el icono de adjuntar en la barra de texto para subir tu PDF.");
                        }
                      }}
                    >
                      <Paperclip className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-semibold text-blue-900 leading-tight">Haz clic para insertar aquí</span>
                      <span className="text-[9px] text-blue-400 font-medium font-sans">El PDF se cargará en este formulario</span>
                    </Button>
                  )}
                </div>
                
                <Button 
                  className="w-full bg-black text-white hover:bg-gray-800 text-xs font-bold py-3 rounded-xl mt-2 shadow-lg active:scale-[0.98] transition-all"
                  onClick={(e) => {
                    // Buscar los inputs dentro del contenedor actual del botón
                    const container = (e.currentTarget as HTMLElement).closest('.mt-3');
                    if (!container) return;
                    
                    const inputs = container.querySelectorAll('input');
                    const selects = container.querySelectorAll('select');
                    
                    const monto = inputs[0]?.value;
                    const fecha = inputs[1]?.value;
                    const ref = inputs[2]?.value;
                    const banco = selects[0]?.value;
                    const motivo = selects[1]?.value;
                    
                    const hasPdf = pendingAttachments.some(a => a.mimeType === 'application/pdf' || a.type === 'file');

                    if (!monto || !fecha || !ref || banco.includes('Seleccionar') || motivo.includes('Seleccionar')) {
                      alert("Por favor completa todos los campos de texto y selección.");
                      return;
                    }
                    
                    if (!hasPdf) {
                      alert("Por favor adjunta el comprobante oficial en formato PDF.");
                      return;
                    }

                    const text = `Monto: ${monto}\nFecha: ${fecha}\nRef: ${ref}\nBanco: ${banco}\nMotivo: ${motivo}`;
                    const chatTextarea = document.querySelector('textarea') as HTMLTextAreaElement;
                    if (chatTextarea) {
                      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                      nativeInputValueSetter?.call(chatTextarea, text);
                      chatTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                      
                      setTimeout(() => {
                        const sendButton = chatTextarea.closest('form')?.querySelector('button[type="submit"]') as HTMLButtonElement;
                        sendButton?.click();
                      }, 100);
                    }
                  }}
                >
                  Confirmar y Enviar Datos
                </Button>
              </div>
            </div>
          )}

          {isAssistant && content.includes("__SIGNED_DOCUMENT_FORM__") && !isLoading && (
            <div className="mt-3 bg-white border border-green-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-[320px]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 leading-tight">Autorización Firmada</h4>
                  <p className="text-[10px] text-gray-500">Sube el documento con tu firma y huella</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-green-50/30 rounded-lg p-3 border border-green-100/50">
                  <p className="text-[11px] text-green-800 leading-relaxed font-medium">
                    Por favor, adjunta aquí el documento que descargaste, una vez firmado y con tu huella digital.
                  </p>
                </div>

                <div className="pt-2">
                  <label className="text-[10px] uppercase font-bold text-gray-400 ml-1 block mb-1">Documento Firmado (Solo PDF)</label>
                  
                  {pendingAttachments.some(a => a.mimeType === 'application/pdf' || a.type === 'file') ? (
                    <div className="flex items-center justify-between p-3 bg-green-50/50 border border-green-100 rounded-xl animate-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-green-900 truncate max-w-[150px]">
                            {pendingAttachments.find(a => a.mimeType === 'application/pdf' || a.type === 'file')?.fileName || 'autorizacion_firmada.pdf'}
                          </span>
                          <span className="text-[10px] text-green-400">Listo para validar</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const pdf = pendingAttachments.find(a => a.mimeType === 'application/pdf' || a.type === 'file');
                          if (pdf && onRemoveAttachment) onRemoveAttachment(pdf.id);
                        }}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      type="button"
                      className="w-full h-14 border-dashed border-2 border-green-100 bg-green-50/20 hover:bg-green-50 hover:border-green-300 group transition-all rounded-xl flex flex-col items-center justify-center gap-0.5 shadow-none"
                      onClick={() => {
                        const realInput = document.querySelector('input[type="file"][accept*="pdf"]') as HTMLInputElement;
                        if (realInput) {
                          realInput.click();
                        } else {
                          alert("Por favor, usa el icono de adjuntar en la barra de texto para subir tu PDF.");
                        }
                      }}
                    >
                      <Paperclip className="w-4 h-4 text-green-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-semibold text-green-900 leading-tight">Adjuntar documento firmado</span>
                      <span className="text-[9px] text-green-400 font-medium font-sans italic">Hacer clic aquí</span>
                    </Button>
                  )}
                </div>
                
                <Button 
                  className="w-full bg-green-600 text-white hover:bg-green-700 text-xs font-bold py-3 rounded-xl mt-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
                  disabled={!pendingAttachments.some(a => a.mimeType === 'application/pdf' || a.type === 'file')}
                  onClick={() => {
                    const text = `He enviado el documento de autorización firmado.`;
                    const chatTextarea = document.querySelector('textarea') as HTMLTextAreaElement;
                    if (chatTextarea) {
                      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                      nativeInputValueSetter?.call(chatTextarea, text);
                      chatTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                      
                      setTimeout(() => {
                        const sendButton = chatTextarea.closest('form')?.querySelector('button[type="submit"]') as HTMLButtonElement;
                        sendButton?.click();
                      }, 100);
                    }
                  }}
                >
                  Enviar Documento Firmado
                </Button>
              </div>
            </div>
          )}

          {isAssistant && content.includes("__CANCELLATION_FORM__") && !isLoading && (
            <div className="mt-3 bg-white border border-red-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-[320px]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <LogOut className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 leading-tight">Solicitud de Cancelación</h4>
                  <p className="text-[10px] text-gray-500">Completa los datos para procesar la baja</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Motivo de Cancelación</label>
                  <select className="text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:border-red-200 appearance-none">
                    <option>Seleccionar motivo...</option>
                    <option>Fallas técnicas</option>
                    <option>Mudanza</option>
                    <option>Costos</option>
                    <option>Cambio de proveedor</option>
                    <option>Otros</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Detalle del motivo</label>
                  <textarea placeholder="Explica brevemente..." className="text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:border-red-200 min-h-[60px]" />
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                  <input type="checkbox" id="equipos" className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
                  <label htmlFor="equipos" className="text-[11px] text-gray-600 font-medium">Tengo los equipos en mi poder</label>
                </div>

                <Button 
                  className="w-full bg-red-600 text-white hover:bg-red-700 text-xs font-bold py-3 rounded-xl mt-2 shadow-lg active:scale-[0.98] transition-all"
                  onClick={(e) => {
                    const container = (e.currentTarget as HTMLElement).closest('.mt-3');
                    if (!container) return;
                    const select = container.querySelector('select');
                    const textarea = container.querySelector('textarea');
                    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;

                    if (!select?.value || select.value.includes('...') || !textarea?.value || !checkbox.checked) {
                      alert("Por favor completa el motivo, el detalle y confirma la posesión de los equipos.");
                      return;
                    }

                    const text = `Solicitud de Cancelación:\nMotivo: ${select.value}\nDetalle: ${textarea.value}\nEquipos en mano: Sí`;
                    const chatTextarea = document.querySelector('textarea') as HTMLTextAreaElement;
                    if (chatTextarea) {
                      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                      nativeInputValueSetter?.call(chatTextarea, text);
                      chatTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                      setTimeout(() => {
                        const sendButton = chatTextarea.closest('form')?.querySelector('button[type="submit"]') as HTMLButtonElement;
                        sendButton?.click();
                      }, 100);
                    }
                  }}
                >
                  Confirmar Cancelación
                </Button>
              </div>
            </div>
          )}

          {isAssistant && content.includes("__REACTIVATION_FORM__") && !isLoading && (
            <div className="mt-3 bg-white border border-blue-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-[320px]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <MessageSquarePlus className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 leading-tight">Reactivación de Servicio</h4>
                  <p className="text-[10px] text-gray-500">Retoma tu conexión de inmediato</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">¿Equipos conectados y encienden?</label>
                  <select className="text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:border-blue-200 appearance-none">
                    <option>Seleccionar...</option>
                    <option>Sí, están operativos</option>
                    <option>No, no los tengo o no encienden</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Plan a contratar</label>
                  <select className="text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:border-blue-200 appearance-none">
                    <option>Seleccionar plan...</option>
                    <option>Plan Residencial</option>
                    <option>Plan PYME (Empresas)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Ciclo de Facturación</label>
                  <select className="text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:border-blue-200 appearance-none">
                    <option>Seleccionar ciclo...</option>
                    <option>Ciclo 10 (Corte el 15)</option>
                    <option>Ciclo 25 (Corte el 30)</option>
                  </select>
                </div>


                <div className="pt-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 ml-1 block mb-1">Comprobante (Deuda + Mes)</label>
                  {pendingAttachments.some(a => a.mimeType === 'application/pdf' || a.type === 'file') ? (
                    <div className="p-2 border border-blue-100 bg-blue-50 rounded-lg flex items-center justify-between">
                       <span className="text-[10px] font-bold text-blue-700 truncate max-w-[150px]">PDF Listo</span>
                       <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => {
                          const pdf = pendingAttachments.find(a => a.mimeType === 'application/pdf' || a.type === 'file');
                          if (pdf && onRemoveAttachment) onRemoveAttachment(pdf.id);
                       }}><X className="w-3 h-3 text-red-400" /></Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-10 border-dashed border-gray-200 text-[10px] text-gray-500"
                      onClick={() => {
                        const realInput = document.querySelector('input[type="file"][accept*="pdf"]') as HTMLInputElement;
                        realInput?.click();
                      }}
                    >
                      Adjuntar Pago en PDF
                    </Button>
                  )}
                </div>

                <Button 
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold py-3 rounded-xl mt-2 shadow-lg active:scale-[0.98] transition-all"
                  onClick={(e) => {
                    const container = (e.currentTarget as HTMLElement).closest('.mt-3');
                    if (!container) return;
                    const selects = container.querySelectorAll('select');
                    const hasPdf = pendingAttachments.some(a => a.mimeType === 'application/pdf' || a.type === 'file');

                    if (selects[0].value.includes('...') || selects[1].value.includes('...') || selects[2].value.includes('...') || !hasPdf) {
                      alert("Por favor completa el estado de equipos, el plan, el ciclo y adjunta el comprobante de pago.");
                      return;
                    }

                    const text = `Solicitud de Reactivación:\nEquipos: ${selects[0].value}\nPlan: ${selects[1].value}\nCiclo: ${selects[2].value}\nPago adjunto: Sí`;

                    const chatTextarea = document.querySelector('textarea') as HTMLTextAreaElement;
                    if (chatTextarea) {
                      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                      nativeInputValueSetter?.call(chatTextarea, text);
                      chatTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                      setTimeout(() => {
                        const sendButton = chatTextarea.closest('form')?.querySelector('button[type="submit"]') as HTMLButtonElement;
                        sendButton?.click();
                      }, 100);
                    }
                  }}
                >
                  Solicitar Reactivación
                </Button>
              </div>
            </div>
          )}
          
          
          {isAssistant && content.includes("__PLAN_PAYMENT_FORM__") && !isLoading && (
            <div className="mt-3 bg-white border border-amber-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-[320px]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-100">
                  <Landmark className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 leading-tight">Datos de Pago</h4>
                  <p className="text-[10px] text-gray-500">Transfiera el monto para procesar el cambio</p>
                </div>
              </div>

              <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-3">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-500 font-medium">Banco:</span>
                  <span className="text-gray-900 font-bold">Banco Provincial</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-500 font-medium">Pago Móvil:</span>
                  <span className="text-gray-900 font-bold">0412-0000000 / 0108</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-500 font-medium">RIF/Cédula:</span>
                  <span className="text-gray-900 font-bold">J-40000000-0</span>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1 border-t border-gray-200">
                  <span className="text-gray-500 font-medium">Zelle:</span>
                  <span className="text-gray-900 font-bold">pagos@sisprotgf.com</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-gray-500 text-center font-medium">¿Ya realizaste el pago?</p>
                <Button 
                  className="w-full bg-amber-500 text-white hover:bg-amber-600 text-xs font-bold py-3 rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  onClick={() => {
                    const paperclipButton = document.querySelector('button[title="Adjuntar imagen o video"]') as HTMLButtonElement;
                    if (paperclipButton) {
                      paperclipButton.click();
                    } else {
                      alert("Por favor usa el icono de adjuntar (clip) para subir tu comprobante.");
                    }
                  }}
                >
                  <UploadCloud className="w-4 h-4" />
                  Subir Comprobante
                </Button>
                <p className="text-[9px] text-gray-400 text-center italic leading-tight mt-2">
                  Una vez confirmemos el pago, tu plan se actualizará en unos minutos.
                </p>
              </div>
            </div>
          )}

          {isAssistant && content.includes("__PLAN_CHANGE_FORM__") && !isLoading && (
            <div className="mt-3 bg-white border border-blue-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-[320px]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
                  <Maximize2 className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 leading-tight">Cambio de Plan</h4>
                  <p className="text-[10px] text-gray-500">Upgrade o Downgrade de tu servicio</p>
                </div>
              </div>

              {(() => {
                const isPyme = (clientData?.planName || "").toLowerCase().match(/pyme|comercial|empresa/i) || 
                               (clientData?.clientType || "").toLowerCase().match(/pyme|comercial|empresa/i) ||
                               (clientData as unknown as Record<string, unknown>)?.client_type === 2;
                const currentPlanText = clientData?.planName || "Plan No Detectado";
                
                return (
                  <div className="space-y-3">
                    <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100/50 mb-1">
                      <p className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">Plan Actual:</p>
                      <p className="text-xs font-semibold text-gray-700">{currentPlanText}</p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Tipo de Gestión</label>
                      <select 
                        id="plan-change-type"
                        className="text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:border-indigo-200 appearance-none font-medium"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="UPGRADE">🚀 Upgrade (Aumentar Velocidad)</option>
                        <option value="DOWNGRADE">📉 Downgrade (Reducir Plan)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Plan Destino</label>
                      <select 
                        id="plan-change-target"
                        className="text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:border-indigo-200 appearance-none font-medium"
                      >
                        <option value="">Seleccionar plan...</option>
                        {isPyme ? (
                          <>
                            <option value="102">150 Megas - $27.60</option>
                            <option value="34">300 Megas - $39.09</option>
                            <option value="103">400 Megas - $51.74</option>
                            <option value="36">650 Megas - $70.18</option>
                            <option value="38">800 Megas - $110.40</option>
                            <option value="104">1 Giga - $161.00</option>
                            <option value="99">1.2 Giga Proyecto - $464.00</option>
                          </>
                        ) : (
                          <>
                            <option value="97">10 Megas - $18.00</option>
                            <option value="2">30 Megas - $20.00</option>
                            <option value="100">300 Megas - $27.60</option>
                            <option value="21">450 Megas - $34.50</option>
                            <option value="19">1 Giga - $74.70</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                      <input type="checkbox" id="plan-solvencia" className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                      <label htmlFor="plan-solvencia" className="text-[10px] text-gray-600 font-medium">Confirmo que el contrato está solvente</label>
                    </div>

                    <Button 
                      className="w-full bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold py-3 rounded-xl mt-2 shadow-lg active:scale-[0.98] transition-all"
                      onClick={(e) => {
                        const container = (e.currentTarget as HTMLElement).closest('.mt-3');
                        if (!container) return;
                        const typeSelect = container.querySelector('#plan-change-type') as HTMLSelectElement;
                        const targetSelect = container.querySelector('#plan-change-target') as HTMLSelectElement;
                        const checkbox = container.querySelector('#plan-solvencia') as HTMLInputElement;

                        if (!typeSelect.value || !targetSelect.value || !checkbox.checked) {
                          alert("Por favor selecciona el tipo de gestión, el plan nuevo y confirma tu solvencia.");
                          return;
                        }

                        const planName = targetSelect.options[targetSelect.selectedIndex].text;
                        const planId = targetSelect.value;
                        const type = typeSelect.value;

                        // Si es UPGRADE, primero solicitamos presupuesto
                        const text = type === "UPGRADE" 
                          ? `Deseo calcular el presupuesto para un UPGRADE al plan ${planName} con ID ${planId}`
                          : `Deseo solicitar un DOWNGRADE al plan ${planName} con ID ${planId} para el final del ciclo`;

                        const chatTextarea = document.querySelector('textarea') as HTMLTextAreaElement;
                        if (chatTextarea) {
                          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                          nativeInputValueSetter?.call(chatTextarea, text);
                          chatTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                          setTimeout(() => {
                            const sendButton = chatTextarea.closest('form')?.querySelector('button[type="submit"]') as HTMLButtonElement;
                            sendButton?.click();
                          }, 100);
                        }
                      }}
                    >
                      Continuar con Gestión
                    </Button>
                  </div>
                );
              })()}
            </div>
          )}

          {isAssistant && content.includes("__SATISFACTION_SURVEY__") && !isLoading && (
1246:             <div className="mt-3 bg-white border border-yellow-200 rounded-2xl p-5 shadow-lg animate-in fade-in zoom-in-95 duration-300 w-full max-w-[320px] text-center">
1247:               <div className="flex flex-col items-center gap-4">
1248:                 <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center border border-yellow-100">
1249:                   <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
1250:                 </div>
1251:                 
1252:                 <div>
1253:                   <h4 className="text-base font-black text-gray-900 leading-tight">¿Qué te pareció mi atención?</h4>
1254:                   <p className="text-xs text-gray-500 mt-1">Califica tu experiencia de 1 a 5 estrellas</p>
1255:                 </div>
1256: 
1257:                 <div className="flex gap-2 py-2">
1258:                   {[1, 2, 3, 4, 5].map((star) => (
1259:                     <button
1260:                       key={star}
1261:                       onClick={() => {
1262:                         const chatTextarea = document.querySelector('textarea') as HTMLTextAreaElement;
1263:                         if (chatTextarea) {
1264:                           const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
1265:                           nativeInputValueSetter?.call(chatTextarea, star.toString());
1266:                           chatTextarea.dispatchEvent(new Event('input', { bubbles: true }));
1267:                           setTimeout(() => {
1268:                             const sendButton = chatTextarea.closest('form')?.querySelector('button[type="submit"]') as HTMLButtonElement;
1269:                             sendButton?.click();
1270:                           }, 100);
1271:                         }
1272:                       }}
1273:                       className="p-1 hover:scale-125 transition-transform group"
1274:                     >
1275:                       <Star className="w-8 h-8 text-gray-200 group-hover:text-yellow-400 group-hover:fill-yellow-400 transition-colors" />
1276:                     </button>
1277:                   ))}
1278:                 </div>
1279: 
1280:                 <p className="text-[10px] text-gray-400 italic">Tu opinión nos ayuda a seguir mejorando para ti 🙌</p>
1281:               </div>
1282:             </div>
1283:           )}
1284:           
1285:           {isAssistant && content.includes("__ZELLE_BINANCE_FORM__") && !isLoading && (
            <div className="mt-3 bg-white border border-green-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-[320px]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center border border-green-100">
                  <CreditCard className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 leading-tight">Conciliación de Pago</h4>
                  <p className="text-[10px] text-gray-500">Zelle o Binance Pay</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Método de Pago</label>
                  <select 
                    id="zb-method"
                    className="text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:border-green-200 appearance-none font-medium"
                  >
                    <option value="Zelle">Zelle 🟣</option>
                    <option value="Binance">Binance Pay 🟡</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Correo del Emisor</label>
                  <input id="zb-email" type="email" placeholder="ejemplo@correo.com" className="text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:border-green-200" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Monto (USD)</label>
                    <input id="zb-amount" type="text" placeholder="0.00" className="text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:border-green-200" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Fecha</label>
                    <input id="zb-date" type="text" placeholder="DD/MM/AAAA" className="text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:border-green-200" />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Referencia / ID</label>
                  <input id="zb-ref" type="text" placeholder="Número de confirmación" className="text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:border-green-200" />
                </div>

                <Button 
                  className="w-full bg-black text-white hover:bg-gray-800 text-xs font-bold py-3 rounded-xl mt-2 shadow-lg active:scale-[0.98] transition-all"
                  onClick={(e) => {
                    const container = (e.currentTarget as HTMLElement).closest('.mt-3');
                    if (!container) return;
                    const method = (container.querySelector('#zb-method') as HTMLSelectElement).value;
                    const email = (container.querySelector('#zb-email') as HTMLInputElement).value;
                    const amount = (container.querySelector('#zb-amount') as HTMLInputElement).value;
                    const date = (container.querySelector('#zb-date') as HTMLInputElement).value;
                    const ref = (container.querySelector('#zb-ref') as HTMLInputElement).value;

                    if (!email || !amount || !date || !ref) {
                      alert("Por favor completa todos los campos para procesar la conciliación.");
                      return;
                    }

                    const text = `Deseo conciliar mi pago de ${method}.\n\nDatos de la transacción:\n- Correo: ${email}\n- Monto: ${amount} USD\n- Referencia: ${ref}\n- Fecha: ${date}`;

                    const chatTextarea = document.querySelector('textarea') as HTMLTextAreaElement;
                    if (chatTextarea) {
                      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                      nativeInputValueSetter?.call(chatTextarea, text);
                      chatTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                      setTimeout(() => {
                        const sendButton = chatTextarea.closest('form')?.querySelector('button[type="submit"]') as HTMLButtonElement;
                        sendButton?.click();
                      }, 100);
                    }
                  }}
                >
                  Verificar Pago en Tiempo Real
                </Button>
              </div>
            </div>
          )}
          
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
          <Image
            src={expandedImage}
            alt="Imagen expandida"
            fill
            className="object-contain rounded-lg p-2"
            unoptimized
          />
        </div>
      )}
    </>
  );
}

export const ChatMessage = memo(ChatMessageComponent);


