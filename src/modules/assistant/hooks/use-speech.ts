"use client";

import { useCallback, useRef, useEffect } from "react";
import { cleanTextForSpeech } from "./use-assistant-chat.utils";

export function useSpeech() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Cargar voces para el fallback (navegador)
  const loadVoices = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    const femaleNames = ["helena", "sabina", "paulina", "monica", "hilda", "pilar", "marta", "elena", "laura", "femenina", "female", "luciana", "mónica", "juana"];
    voiceRef.current = voices.find(v => v.lang.startsWith("es") && femaleNames.some(name => v.name.toLowerCase().includes(name))) || voices.find(v => v.lang.startsWith("es")) || null;
  }, []);

  useEffect(() => {
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [loadVoices]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const speakFallback = useCallback((text: string) => {
    console.log("[SPEECH] Usando fallback del navegador...");
    const utterance = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.lang = "es-VE";
    utterance.rate = 1.0;
    utterance.pitch = 1.2;
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback(async (text: string) => {
    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) return;

    stop();

    try {
      console.log("[SPEECH] Intentando ElevenLabs para:", cleanedText.substring(0, 30) + "...");
      const response = await fetch("/api/assistant/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanedText }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error en API de ElevenLabs`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (audioRef.current === audio) audioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error("[SPEECH_HOOK_ERROR]", error);
      // Si ElevenLabs falla por cualquier motivo (API, red, etc.), usamos el navegador
      speakFallback(cleanedText);
    }
  }, [stop, speakFallback]);

  return { speak, stop };
}
