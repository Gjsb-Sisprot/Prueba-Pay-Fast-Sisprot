import { useState, useCallback } from "react";
import { Client } from "../types/client";
import { clientApiService } from "../services/client-service";
import { isAxiosError } from "axios";


export const useClientData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  const getClientById = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await clientApiService.getClientById(id);
      setClient(data);
      return data;
    } catch (err: unknown) {
      let errorMessage = "Error al obtener datos del cliente";
      
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
  }, []);

  const patchClient = useCallback(async (id: number, data: Partial<Client>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedData = await clientApiService.updateClient(id, data);
      setClient(updatedData);
      return updatedData;
    } catch (err: unknown) {
      let errorMessage = "Error al actualizar datos del cliente";
      
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
  }, []);

  return {
    client,
    loading,
    error,
    getClientById,
    patchClient,
    setClient,
  };
};
