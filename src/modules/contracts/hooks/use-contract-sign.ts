import { useState, useCallback } from "react";
import { clientApiService } from "../services/client-service";
import { useClientStore } from "@/shared/lib/store/client-store";
import { isAxiosError } from "axios";

export const useContractSign = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setContractSignature } = useClientStore();

  const signContract = useCallback(async (contractId: number, signatureBase64: string) => {
    setLoading(true);
    setError(null);
    try {
      const payload: {
        signature_base64: string;
        update_terms_and_conditions: boolean;
        vame_code: string;
      } = {
        signature_base64: signatureBase64,
        update_terms_and_conditions: true,
        vame_code: "contrato",
      };
      const result = await clientApiService.signContract(contractId, payload);
      setContractSignature(signatureBase64);
      return result;
    } catch (err: unknown) {
      let errorMessage = "Error al firmar el contrato";
      
      if (isAxiosError(err)) {
        errorMessage = err.response?.data?.message || err.response?.data?.error || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setContractSignature]);

  return {
    loading,
    error,
    signContract,
  };
};
