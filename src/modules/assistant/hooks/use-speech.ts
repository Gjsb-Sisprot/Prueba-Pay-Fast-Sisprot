"use client";

import { useCallback, useEffect, useRef } from "react";
import { cleanTextForSpeech } from "./use-assistant-chat.utils";

export function useSpeech() {
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const loadVoices = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    
    // Lista de nombres comunes de voces femeninas en español
    const femaleNames = ["helena", "sabina", "paulina", "monica", "hilda", "pilar", "marta", "elena", "laura", "femenina", "female", "luciana", "mónica", "juana"];

    // 1. Intentar encontrar una voz femenina que sea específicamente de Venezuela o Latam
    let femaleSpanishVoice = voices.find(v => 
      v.lang.startsWith("es") && 
      femaleNames.some(name => v.name.toLowerCase().includes(name))
    );

    // 2. Si no encontramos por nombre, buscar cualquier voz que explícitamente diga "female" o "femenino" en español
    if (!femaleSpanishVoice) {
      femaleSpanishVoice = voices.find(v => 
        v.lang.startsWith("es") && 
        (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("femenino"))
      );
    }

    // 3. Priorizar acentos (Venezuela, México) si son femeninas
    const preferredVoice = voices.find(v => 
      (v.lang === "es-VE" || v.lang.includes("es_VE") || v.lang.includes("es-MX")) && 
      femaleNames.some(name => v.name.toLowerCase().includes(name))
    ) || femaleSpanishVoice;

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
