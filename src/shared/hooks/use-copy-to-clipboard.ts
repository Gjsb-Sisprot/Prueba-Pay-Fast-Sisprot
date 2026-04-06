"use client";

import { useState } from "react";

/**
 * Hook para manejar copiado al portapapeles con soporte de fallback.
 * Permite copiar texto individual o múltiples campos.
 */
export function useCopyToClipboard() {
  const [copiedFields, setCopiedFields] = useState<Set<string>>(new Set());
  const [allCopied, setAllCopied] = useState(false);

  // 🔹 Copiar texto de forma segura
  const safeCopy = async (text: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
    } catch (error) {
      console.error("Error al copiar texto:", error);
    }
  };

  // 🔹 Copiar un campo individual
  const copyField = async (text: string, field: string) => {
    await safeCopy(text);
    setCopiedFields((prev) => new Set([...prev, field]));

    setTimeout(() => {
      setCopiedFields((prev) => {
        const newSet = new Set(prev);
        newSet.delete(field);
        return newSet;
      });
    }, 2000);
  };

  // 🔹 Copiar todos los campos
  const copyAll = async (texts: string[]) => {
    const combined = texts.join("\n");
    await safeCopy(combined);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  return {
    copiedFields,
    allCopied,
    copyField,
    copyAll,
  };
}
