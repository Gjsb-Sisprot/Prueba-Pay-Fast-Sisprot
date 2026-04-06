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
    const isMobile = isMobileDevice();

    // Protección agresiva contra herramientas de desarrollador
    const protectAgainstDevTools = () => {
      // Sobreescribir console solo en producción y desktop
      if (process.env.NODE_ENV === "production" && !isMobile) {
        console.log = () => {};
        console.warn = () => {};
        console.error = () => {};
        console.debug = () => {};
        console.info = () => {};
        console.trace = () => {};
        console.table = () => {};
        console.clear = () => {};
      }

      // Detectar devtools por rendimiento (solo para desktop)
      if (!isMobile) {
        const devtools = {
          open: false,
          orientation: null as string | null,
          reloadCount: 0, // Contador para evitar loops infinitos
          lastReload: 0, // Timestamp del último reload
        };

        const threshold = getDevToolsThreshold();

        const devToolsInterval = setInterval(() => {
          const heightDiff = window.outerHeight - window.innerHeight;
          const widthDiff = window.outerWidth - window.innerWidth;

          if (heightDiff > threshold || widthDiff > threshold) {
            if (!devtools.open) {
              devtools.open = true;
              console.clear();

              // Protección anti-loop: máximo 3 reloads por sesión
              const now = Date.now();
              if (
                process.env.NODE_ENV === "production" &&
                devtools.reloadCount < 3 &&
                now - devtools.lastReload > 5000
              ) {
                // Mínimo 5 segundos entre reloads
                devtools.reloadCount++;
                devtools.lastReload = now;

                // Guardar en sessionStorage para persistir contador
                sessionStorage.setItem(
                  "devtools_reload_count",
                  devtools.reloadCount.toString()
                );
                sessionStorage.setItem("devtools_last_reload", now.toString());

                window.location.reload();
              }
            }
          } else {
            devtools.open = false;
          }
        }, 1000); // Intervalo más largo para reducir impacto

        // Recuperar contadores de reloads de sessionStorage
        const savedReloadCount = sessionStorage.getItem(
          "devtools_reload_count"
        );
        const savedLastReload = sessionStorage.getItem("devtools_last_reload");
        if (savedReloadCount) {
          devtools.reloadCount = parseInt(savedReloadCount, 10);
        }
        if (savedLastReload) {
          devtools.lastReload = parseInt(savedLastReload, 10);
        }

        // Limpiar interval al desmontar
        return () => clearInterval(devToolsInterval);
      }

      // Bloquear debugger statement (solo en desktop)
      if (!isMobile) {
        const debuggerInterval = setInterval(() => {
          const before = Date.now();
          debugger;
          const after = Date.now();
          if (after - before > 100) {
            if (process.env.NODE_ENV === "production") {
              // Solo mostrar advertencia, no reload automático
              console.warn("🚨 Debugger detectado");
            }
          }
        }, 3000); // Intervalo más largo

        return () => clearInterval(debuggerInterval);
      }

      // Protección contra modificación del DOM (ambos dispositivos pero menos agresiva)
      if (process.env.NODE_ENV === "production") {
        const observer = new MutationObserver(() => {
          // Limpiar atributos sospechosos periodicamente
          document.querySelectorAll("*").forEach((el) => {
            if (el.hasAttribute("data-inspector")) {
              el.removeAttribute("data-inspector");
            }
          });
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
        });

        return () => observer.disconnect();
      }
    };

    // Ejecutar protecciones
    const cleanup = protectAgainstDevTools();

    // Protección de eventos de teclado (adaptada para móviles)
    const ultimateKeyProtection = (e: KeyboardEvent) => {
      // En móviles, ser menos agresivo con las protecciones de teclado
      if (isMobile && e.key !== "F12") {
        return; // Solo bloquear F12 en móviles
      }

      const isForbidden =
        // F12
        e.key === "F12" ||
        e.keyCode === 123 ||
        // Solo bloquear otros atajos en desktop
        (!isMobile &&
          // Ctrl+Shift+I
          ((e.ctrlKey && e.shiftKey && (e.key === "I" || e.keyCode === 73)) ||
            // Ctrl+Shift+J
            (e.ctrlKey && e.shiftKey && (e.key === "J" || e.keyCode === 74)) ||
            // Ctrl+Shift+C
            (e.ctrlKey && e.shiftKey && (e.key === "C" || e.keyCode === 67)) ||
            // Ctrl+Shift+K (Firefox)
            (e.ctrlKey && e.shiftKey && (e.key === "K" || e.keyCode === 75)) ||
            // Ctrl+U
            (e.ctrlKey && (e.key === "U" || e.keyCode === 85)) ||
            // Ctrl+S
            (e.ctrlKey && (e.key === "S" || e.keyCode === 83))));

      if (isForbidden) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.clear();

        if (process.env.NODE_ENV === "production" && !isMobile) {
          // Solo aplicar efectos visuales en desktop
          document.body.style.filter = "blur(5px)";
          setTimeout(() => {
            document.body.style.filter = "none";
          }, 500);
        }

        return false;
      }
    };

    // Aplicar en múltiples niveles
    document.addEventListener("keydown", ultimateKeyProtection, true);
    document.addEventListener("keyup", ultimateKeyProtection, true);
    document.addEventListener("keypress", ultimateKeyProtection, true);
    window.addEventListener("keydown", ultimateKeyProtection, true);
    window.addEventListener("keyup", ultimateKeyProtection, true);

    // Protección contra paste de scripts
    document.addEventListener(
      "paste",
      (e) => {
        const paste = e.clipboardData?.getData("text");
        if (
          paste &&
          (paste.includes("javascript:") || paste.includes("<script"))
        ) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      },
      true
    );

    // Cleanup
    return () => {
      document.removeEventListener("keydown", ultimateKeyProtection, true);
      document.removeEventListener("keyup", ultimateKeyProtection, true);
      document.removeEventListener("keypress", ultimateKeyProtection, true);
      window.removeEventListener("keydown", ultimateKeyProtection, true);
      window.removeEventListener("keyup", ultimateKeyProtection, true);
      if (cleanup && typeof cleanup === "function") {
        cleanup();
      }
    };
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
