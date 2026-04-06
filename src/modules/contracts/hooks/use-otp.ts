import { useState, useCallback } from "react";
import { otpApiService, CommunicationMethod } from "../services/otp-service";
import { isAxiosError } from "axios";

export const useOtp = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const generateOtp = useCallback(async (communication_method: CommunicationMethod, sender: string) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const response = await otpApiService.generateOtp({ communication_method, sender });
      setSuccess(true);
      return response;
    } catch (err: unknown) {
      let errorMessage = "Error al generar OTP";
      
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

  const validateOtp = useCallback(async (code: string, communication_method: CommunicationMethod) => {
    setLoading(true);
    setError(null);
    try {
      const response = await otpApiService.validateOtp({ code, communication_method });
      return response;
    } catch (err: unknown) {
      let errorMessage = "Error al validar OTP o OTP incorrecto";
      
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
    loading,
    error,
    success,
    generateOtp,
    validateOtp,
    setError,
  };
};
