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
    const isMobile = isMobileDevice();

    // Limpiar contadores de sessionStorage en móviles para evitar problemas persistentes
    if (isMobile) {
      sessionStorage.removeItem("devtools_reload_count");
      sessionStorage.removeItem("devtools_last_reload");
    }

    // Detectar herramientas de desarrollador (solo en desktop)
    const detectDevTools = () => {
      if (isMobile) {
        // En móviles, no hacer esta verificación agresiva
        setIsDevToolsOpen(false);
        return;
      }

      // Umbral más alto para desktop y verificación más robusta
      const threshold = 200; // Incrementado de 160 a 200
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold =
        window.outerHeight - window.innerHeight > threshold;

      // Verificación adicional: asegurar que realmente son devtools y no zoom/viewport
      const suspiciousRatio =
        (window.outerHeight - window.innerHeight) / window.innerHeight > 0.3 ||
        (window.outerWidth - window.innerWidth) / window.innerWidth > 0.3;

      if ((widthThreshold || heightThreshold) && suspiciousRatio) {
        setIsDevToolsOpen(true);
      } else {
        setIsDevToolsOpen(false);
      }
    };

    // Detectar debugger (solo en desktop)
    const detectDebugger = () => {
      if (isMobile) return; // Evitar problemas en móviles

      const start = performance.now();
      debugger;
      const end = performance.now();
      if (end - start > 100) {
        setIsDevToolsOpen(true);
      }
    };

    // Deshabilitar atajos de teclado comunes - ADAPTADO PARA MÓVILES
    const handleKeyDown = (e: KeyboardEvent) => {
      // En móviles, solo bloquear F12 si existe
      if (isMobile) {
        if (e.key === "F12" || e.keyCode === 123) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
        return; // No bloquear otros atajos en móviles
      }

      // F12 - Herramientas de desarrollador
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

      // Ctrl+Shift+I (Inspector) - Múltiples combinaciones
      if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.keyCode === 73)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && (e.key === "J" || e.keyCode === 74)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

      // Ctrl+U (Ver código fuente)
      if (e.ctrlKey && (e.key === "u" || e.key === "U" || e.keyCode === 85)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

      // Ctrl+Shift+C (Selector de elementos) - REFORZADO
      if (
        e.ctrlKey &&
        e.shiftKey &&
        (e.key === "C" || e.key === "c" || e.keyCode === 67)
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        // Mostrar advertencia adicional solo en desktop
        if (process.env.NODE_ENV === "production") {
          alert("🚨 Herramientas de desarrollador no autorizadas");
        }
        return false;
      }

      // Ctrl+Shift+K (Console Firefox)
      if (e.ctrlKey && e.shiftKey && (e.key === "K" || e.keyCode === 75)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

      // Ctrl+S (Guardar página)
      if (e.ctrlKey && (e.key === "s" || e.key === "S" || e.keyCode === 83)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+A (Seleccionar todo) - Opcional, solo en desktop
      if (e.ctrlKey && (e.key === "a" || e.key === "A" || e.keyCode === 65)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+P (Imprimir)
      if (e.ctrlKey && (e.key === "p" || e.key === "P" || e.keyCode === 80)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Deshabilitar menú contextual (menos agresivo en móviles)
    const handleContextMenu = (e: MouseEvent) => {
      if (!isMobile) {
        // Solo en desktop
        e.preventDefault();
        return false;
      }
    };

    // Detectar selección de texto (opcional, solo desktop)
    const handleSelectStart = () => {
      if (!isMobile) {
        // Descomenta si quieres deshabilitar selección de texto en desktop
        // e.preventDefault();
        // return false;
      }
    };

    // Limpiar console periodicamente y mostrar advertencias (solo desktop)
    const clearConsole = () => {
      if (isMobile) return; // No limpiar console en móviles

      console.clear();
      if (process.env.NODE_ENV === "production") {
        console.log(
          "%c🚨 ADVERTENCIA DE SEGURIDAD",
          "color: red; font-size: 16px; font-weight: bold;"
        );
        console.log(
          "%cEsta aplicación está protegida contra inspección no autorizada.",
          "color: red; font-size: 12px;"
        );
      }
    };

    // Event listeners - REFORZADOS con múltiples métodos
    document.addEventListener("keydown", handleKeyDown, true); // Captura en fase de captura
    document.addEventListener("keyup", handleKeyDown, true); // También en keyup
    document.addEventListener("keypress", handleKeyDown, true); // Y en keypress
    window.addEventListener("keydown", handleKeyDown, true); // También en window
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("selectstart", handleSelectStart, true);

    // Protección adicional para eventos de mouse (solo desktop)
    const handleMouseDown = (e: MouseEvent) => {
      if (!isMobile && e.button === 1) {
        // Bloquear clic con botón del medio solo en desktop
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener("mousedown", handleMouseDown, true);

    // Detectar devtools periodicamente (solo desktop)
    let devToolsInterval: NodeJS.Timeout | null = null;
    let debuggerInterval: NodeJS.Timeout | null = null;
    let consoleInterval: NodeJS.Timeout | null = null;

    if (!isMobile) {
      devToolsInterval = setInterval(detectDevTools, 1000); // Intervalo más largo
      debuggerInterval = setInterval(detectDebugger, 2000); // Intervalo más largo
      consoleInterval = setInterval(clearConsole, 3000); // Intervalo más largo
    }

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keyup", handleKeyDown, true);
      document.removeEventListener("keypress", handleKeyDown, true);
      window.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("selectstart", handleSelectStart, true);
      document.removeEventListener("mousedown", handleMouseDown, true);

      if (devToolsInterval) clearInterval(devToolsInterval);
      if (debuggerInterval) clearInterval(debuggerInterval);
      if (consoleInterval) clearInterval(consoleInterval);
    };
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

  // Mostrar advertencia si se detectan dev tools (solo para desktop)
  if (
    isDevToolsOpen &&
    process.env.NODE_ENV === "production" &&
    !isMobileDevice()
  ) {
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
