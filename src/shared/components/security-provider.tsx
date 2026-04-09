"use client";

import { useEffect, useState } from "react";
import { EnhancedSecurity } from "./enhanced-security";

interface SecurityProviderProps {
  children: React.ReactNode;
  nonce: string | null;
}

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

export function SecurityProvider({ children }: SecurityProviderProps) {
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);

  useEffect(() => {
    /* 
    // Protecciones deshabilitadas por solicitud del usuario para permitir el uso de la consola
    const handleKeyDown = (e: KeyboardEvent) => { ... };
    ...
    */
  }, []);

  // Ofuscar código en producción (solo desktop)
  useEffect(() => {
    const isMobile = isMobileDevice();

    if (process.env.NODE_ENV === "production" && !isMobile) {
      // Ocultar información del DOM
      const removeDataAttributes = () => {
        const elements = document.querySelectorAll("*");
        elements.forEach((el) => {
          // Remover atributos data-* que puedan contener información sensible
          // PERO mantener los necesarios para el funcionamiento de UI (Radix, Shadcn, etc.)
          const allowedDataAttributes = [
            "data-orientation",
            "data-state",
            "data-side",
            "data-align",
            "data-slot",
            "data-loading",
            "data-disabled",
            "data-radix-scroll-area-viewport",
            "data-value",
            "data-placeholder"
          ];

          Array.from(el.attributes).forEach((attr) => {
            if (
              attr.name.startsWith("data-") &&
              !allowedDataAttributes.includes(attr.name)
            ) {
              el.removeAttribute(attr.name);
            }
          });
        });
      };

      // Ejecutar periodicamente
      const cleanupInterval = setInterval(removeDataAttributes, 5000); // Intervalo más largo

      return () => clearInterval(cleanupInterval);
    }
  }, []);

  // Bloqueo de DevTools deshabilitado por solicitud
  if (false && isDevToolsOpen && process.env.NODE_ENV === "production" && !isMobileDevice()) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg max-w-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            🚨 Acceso No Autorizado
          </h2>
          <p className="text-gray-700 mb-4">
            Esta aplicación está protegida. Las herramientas de desarrollador
            han sido detectadas.
          </p>
          <button
            onClick={() => setIsDevToolsOpen(false)}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <EnhancedSecurity />
      {children}
    </>
  );
}
