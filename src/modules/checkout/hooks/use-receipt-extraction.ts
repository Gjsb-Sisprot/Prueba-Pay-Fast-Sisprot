"use client";

import { useState, useCallback } from "react";
import { ExtractedReceiptData } from "@/app/api/ai/extract-receipt/route";

interface UseReceiptExtractionReturn {
  extractData: (file: File) => Promise<ExtractedReceiptData | null>;
  isExtracting: boolean;
  extractionError: string | null;
  clearError: () => void;
}

export function useReceiptExtraction(): UseReceiptExtractionReturn {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === "string") {
          // El resultado incluye el prefijo data:image/...;base64,
          // Lo dejamos completo para que la API pueda usarlo
          resolve(reader.result);
        } else {
          reject(new Error("Error al convertir archivo a base64"));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const extractData = useCallback(
    async (file: File): Promise<ExtractedReceiptData | null> => {
      setIsExtracting(true);
      setExtractionError(null);

      try {
        const base64WithPrefix = await fileToBase64(file);
        // Separar el prefijo del base64 puro
        const [prefixPart, base64Data] = base64WithPrefix.split(",");
        const mimeType = prefixPart.match(/data:(.*?);/)?.[1] || "image/jpeg";

        const response = await fetch("/api/ai/extract-receipt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Error al extraer datos");
        }

        if (result.success && result.data) {
          return result.data as ExtractedReceiptData;
        }

        throw new Error("No se pudieron extraer los datos del comprobante");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error desconocido";
        setExtractionError(message);
        return null;
      } finally {
        setIsExtracting(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setExtractionError(null);
  }, []);

  return {
    extractData,
    isExtracting,
    extractionError,
    clearError,
  };
}
