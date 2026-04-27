"use client";

import { useCallback, useRef } from "react";
import { cleanTextForSpeech } from "./use-assistant-chat.utils";

export function useSpeech() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    // 1. Limpiar texto de emojis y marcadores
    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) return;

    // 2. Detener audio previo si existe
    stop();

    try {
      // 3. Obtener audio desde nuestro proxy de ElevenLabs
      const response = await fetch("/api/assistant/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanedText }),
      });

      if (!response.ok) {
        throw new Error("No se pudo obtener el audio de ElevenLabs");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // Reproducir audio
      await audio.play();
      
      // Limpiar URL del objeto después de que termine de sonar
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
      };
    } catch (error) {
      console.error("[SPEECH_HOOK_ERROR]", error);
    }
  }, [stop]);

  return { speak, stop };
}
