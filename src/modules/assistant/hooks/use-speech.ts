"use client";

import { useCallback, useEffect, useRef } from "react";
import { cleanTextForSpeech } from "./use-assistant-chat.utils";

export function useSpeech() {
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const loadVoices = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    // Buscar una voz femenina con acento venezolano o latinoamericano neutro
    const preferredVoice = voices.find(v => 
      (v.lang === "es-VE" || v.lang.includes("es_VE")) && 
      (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("femenino"))
    ) || voices.find(v => 
      (v.lang === "es-VE" || v.lang.includes("es_VE"))
    ) || voices.find(v => 
      v.lang.startsWith("es") && 
      (v.name.toLowerCase().includes("mexico") || v.name.toLowerCase().includes("sabina") || v.name.toLowerCase().includes("paulina"))
    ) || voices.find(v => 
      v.lang.startsWith("es") && v.name.toLowerCase().includes("google")
    );

    voiceRef.current = preferredVoice || voices.find(v => v.lang.startsWith("es")) || null;
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
