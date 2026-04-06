// src/hooks/payments/useQrPayment.ts
"use client";

import { generateQrPayment, QrPaymentResponse } from "@/shared/lib/api/qr";
import { useState } from "react";

interface UseQrPaymentReturn {
  loading: boolean;
  error: string | null;
  data: QrPaymentResponse | null;
  generateQr: (invoiceId: string) => Promise<void>;
}

export function useQrPayment(): UseQrPaymentReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QrPaymentResponse | null>(null);

  const generateQr = async (invoiceId: string) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await generateQrPayment(invoiceId);
      console.log("=== RESPUESTA DE useQrPayment ===", result);
      setData(result);
    } catch (err: unknown) {
      console.error("Error en useQrPayment:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === "string") {
        setError(err);
      } else {
        setError("Error de conexión con el servidor");
      }
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, data, generateQr };
}
