"use client";

import { useCallback, useEffect, useRef } from "react";
import { cleanTextForSpeech } from "./use-assistant-chat.utils";

export function useSpeech() {
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const loadVoices = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    // Buscar una voz femenina en español
    // Priorizamos nombres comunes de voces femeninas o que contengan "Google" (suelen ser mejores)
    const spanishFemaleVoice = voices.find(v => 
      v.lang.startsWith("es") && 
      (v.name.toLowerCase().includes("female") || 
       v.name.toLowerCase().includes("femenino") || 
       v.name.toLowerCase().includes("google") || 
       v.name.toLowerCase().includes("monica") || 
       v.name.toLowerCase().includes("helena") ||
       v.name.toLowerCase().includes("paulina"))
    );

    voiceRef.current = spanishFemaleVoice || voices.find(v => v.lang.startsWith("es")) || null;
  }, []);

  useEffect(() => {
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [loadVoices]);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;

    // Cancelar cualquier discurso previo
    window.speechSynthesis.cancel();

    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) return;

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }
    
    utterance.lang = "es-VE"; // Español Venezuela o general
    utterance.rate = 1.0;
    utterance.pitch = 1.1; // Un poco más agudo para sonar más femenino si la voz es neutra

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, stop };
}
