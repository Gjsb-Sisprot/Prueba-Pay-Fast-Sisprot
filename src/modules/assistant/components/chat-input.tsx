
"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { Send, Square, Paperclip, X, Image as ImageIcon, Video, Mic, MicOff } from "lucide-react";
import {
  useRef,
  useEffect,
  useState,
  type FormEvent,
  type ChangeEvent,
  useCallback,
  type RefObject,
} from "react";
import type { MediaAttachment, MediaLimits, MediaUsage } from "@/modules/assistant/lib/types";

interface SpeechRecognition extends EventTarget {
  start(): void;
  stop(): void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: () => void;
  onend: () => void;
  onerror: () => void;
  onresult: (event: { 
    resultIndex: number; 
    results: { 
      [key: number]: { 
        isFinal: boolean; 
        [key: number]: { transcript: string }; 
        length: number 
      }; 
      length: number 
    } 
  }) => void;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

interface ChatInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  onStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  pendingAttachments?: MediaAttachment[];
  onAddAttachment?: (file: File) => Promise<{ success: boolean; error?: string }>;
  onRemoveAttachment?: (id: string) => void;
  mediaUsage?: MediaUsage;
  mediaLimits?: MediaLimits;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  onStop,
  placeholder = "Escribe tu mensaje...",
  disabled = false,
  inputRef,
  pendingAttachments = [],
  onAddAttachment,
  onRemoveAttachment,
  mediaUsage,
  mediaLimits,
}: ChatInputProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = (inputRef || internalRef) as RefObject<HTMLTextAreaElement>;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [value, textareaRef]);

  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus();
    }
  }, [disabled, textareaRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if ((value.trim() || pendingAttachments.length > 0) && !isLoading && !disabled) {
        onSubmit(e as unknown as FormEvent<HTMLFormElement>);
      }
    }
  };

  const handleFileSelect = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || !onAddAttachment) return;

      setAttachError(null);
      setIsProcessingFile(true);

      for (const file of Array.from(files)) {
        const result = await onAddAttachment(file);
        if (!result.success && result.error) {
          setAttachError(result.error);
          setTimeout(() => setAttachError(null), 4000);
        }
      }

      setIsProcessingFile(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onAddAttachment]
  );

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as unknown as { SpeechRecognition?: SpeechRecognitionStatic; webkitSpeechRecognition?: SpeechRecognitionStatic }).SpeechRecognition || 
                              (window as unknown as { SpeechRecognition?: SpeechRecognitionStatic; webkitSpeechRecognition?: SpeechRecognitionStatic }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAttachError("Tu navegador no soporta reconocimiento de voz.");
      setTimeout(() => setAttachError(null), 3000);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);

    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        // Append transcribed text to current value
        const newValue = value ? `${value} ${finalTranscript}` : finalTranscript;
        onChange({ target: { value: newValue } } as ChangeEvent<HTMLTextAreaElement>);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isRecording, value, onChange]);

  const canAddMedia =
    mediaUsage &&
    mediaLimits &&
    (mediaUsage.imagesUsed < mediaLimits.maxImages ||
      mediaUsage.videosUsed < mediaLimits.maxVideos);

  return (
    <form onSubmit={onSubmit} className="relative">
      { }
      {attachError && (
        <div className="mx-2 mb-1 px-2 py-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {attachError}
        </div>
      )}

      { }
      {isProcessingFile && (
        <div className="flex items-center gap-2 mx-2 mb-1 px-2 py-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg">
          <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          Procesando video...
        </div>
      )}

      { }
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 pb-0">
          {pendingAttachments.filter(a => a.type !== "file").map((attachment) => (
            <div
              key={attachment.id}
              className="relative group w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
            >
              {attachment.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachment.url}
                  alt="Vista previa del archivo adjunto"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <Video className="w-6 h-6 text-gray-500" />
                  {attachment.duration && (
                    <span className="absolute bottom-0 right-0 text-[10px] bg-black/60 text-white px-1 rounded-tl">
                      {attachment.duration.toFixed(1)}s
                    </span>
                  )}
                </div>
              )}
              {onRemoveAttachment && (
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(attachment.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
        { }
        {onAddAttachment && canAddMedia && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,application/pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isLoading}
              className="h-9 w-9 p-0 text-gray-500 hover:text-gray-700 shrink-0"
              title="Adjuntar imagen o video"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleRecording}
          disabled={disabled || isLoading}
          className={cn(
            "h-9 w-9 p-0 shrink-0 transition-colors",
            isRecording ? "text-red-500 animate-pulse bg-red-50" : "text-gray-500 hover:text-gray-700"
          )}
          title={isRecording ? "Detener grabación" : "Grabar mensaje de voz"}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent text-sm px-2 py-1.5",
            "placeholder:text-gray-400 focus:outline-none",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "max-h-30 min-h-9"
          )}
        />

        {isLoading ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onStop}
            className="h-9 w-9 p-0 bg-red-100 text-red-600 hover:bg-red-200 shrink-0"
            title="Detener"
          >
            <Square className="w-4 h-4 fill-current" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="sm"
            disabled={
              disabled || (!value.trim() && pendingAttachments.length === 0)
            }
            className="h-9 w-9 p-0 bg-black text-white hover:bg-gray-800 disabled:opacity-50 shrink-0"
            title="Enviar"
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>

      { }
      {mediaUsage && mediaLimits && (
        <div className="flex justify-end gap-3 px-2 pt-1 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            {mediaUsage.imagesUsed}/{mediaLimits.maxImages}
          </span>
          <span className="flex items-center gap-1">
            <Video className="w-3 h-3" />
            {mediaUsage.videosUsed}/{mediaLimits.maxVideos}
          </span>
        </div>
      )}
    </form>
  );
}
