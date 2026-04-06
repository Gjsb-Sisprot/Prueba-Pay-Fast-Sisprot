"use client";

import { PaginatedPaymentMethodsResponse } from "@/shared/types/affiliated-methods";
import { fetchAffiliateMethods } from "@/shared/lib/api/methods";
import { useClientStore } from "@/shared/lib/store/client-store";
import { useState, useCallback } from "react";

interface MethodAffiliatePayload {
  client: number;
  method: number;
  sender: string;
  name?: string;
  bank?: number | null;
  identification?: string | null;
}

export interface AfiliationResponse {
  success: boolean;
  status: number;
  message?: string;
  data: unknown;
}

export function useAffiliateMethod() {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { selectedClient } = useClientStore();
  const clientId = selectedClient?.id;
  const [methods, setMethods] = useState<PaginatedPaymentMethodsResponse>();

  const resetMessages = useCallback(() => {
    setSuccessMessage(null);
    setErrorMessage(null);
  }, []);

  const affiliateMethod = useCallback(async (payload: MethodAffiliatePayload) => {
    resetMessages();
    setLoading(true);
    try {
      const response = await fetch("/api/methods/affiliate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });

      const result: AfiliationResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Error al afiliar método de pago");
      }

      setSuccessMessage("Método afiliado exitosamente.");
      return result;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      setErrorMessage(msg || "Error inesperado al afiliar.");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [resetMessages]);

  const loadAffiliateMethods = useCallback(
    async (id?: number) => {
      const effectiveId = id ?? clientId;
      if (!effectiveId) return;

      setLoading(true);
      setErrorMessage(null)
      try {
        const data = await fetchAffiliateMethods(effectiveId);
        setMethods(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg || "Error al obtener métodos afiliados");
      } finally {
        setLoading(false);
      }
    },
    [clientId]
  );



  return {
    affiliateMethod,
    loading,
    successMessage,
    errorMessage,
    resetMessages,
    loadAffiliateMethods,
    methods
  };
}
