"use client";

import { useEffect } from "react";

// Función para detectar dispositivos móviles
const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;

  // Detectar por user agent
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    "mobile",
    "android",
    "iphone",
    "ipad",
    "ipod",
    "blackberry",
    "windows phone",
  ];
  const isMobileUA = mobileKeywords.some((keyword) =>
    userAgent.includes(keyword)
  );

  // Detectar por características del dispositivo
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;

  // Detectar por orientation API
  const hasOrientation = "orientation" in window;

  return isMobileUA || (hasTouch && isSmallScreen) || hasOrientation;
};

// Función para calcular umbrales dinámicos según el dispositivo
const getDevToolsThreshold = (): number => {
  if (isMobileDevice()) {
    // Umbral mucho más alto para móviles (barras de navegación pueden ser grandes)
    return Math.max(300, window.innerHeight * 0.3); // 30% de la altura o 300px
  }
  return 160; // Umbral original para desktop
};

export function EnhancedSecurity() {
  useEffect(() => {
    /*
    // Protecciones deshabilitadas por solicitud del usuario
    const protectAgainstDevTools = () => { ... };
    ...
    */
  }, []);

  return null; // Componente sin render
}

// Hook para protección de componentes específicos
export function useAntiDevTools() {
  useEffect(() => {
    // Protección a nivel de componente
    const handleFocus = () => {
      if (process.env.NODE_ENV === "production") {
        console.clear();
      }
    };

    const handleBlur = () => {
      if (process.env.NODE_ENV === "production") {
        console.clear();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);
}
