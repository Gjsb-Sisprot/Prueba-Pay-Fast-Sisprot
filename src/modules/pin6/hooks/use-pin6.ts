"use client";

import { useState } from "react";
import { useClientStore } from "@/shared/lib/store/client-store";

export function usePin6Change() {
  const { selectedClient } = useClientStore();

  const [isValidatingOld, setIsValidatingOld] = useState(false);
  const [isOldPinValid, setIsOldPinValid] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const resetStatus = () => {
    setStatusMessage(null);
    setStatusType(null);
  };

  const validateOldPin = async (pin: string) => {
    resetStatus();
    setIsOldPinValid(false);

    if (pin.length !== 6) return;

    setIsValidatingOld(true);

    try {
      const response = await fetch(
        `/api/contracts?client=${selectedClient?.id}`,
      );

      const data = await response.json();
      const expectedPin = data?.results?.[0]?.pin_code;

      if (pin === expectedPin) {
        setIsOldPinValid(true);
        setStatusMessage("PIN validado exitosamente.");
        setStatusType("success");

        setTimeout(() => resetStatus(), 2000);
      } else {
        setStatusMessage("PIN actual incorrecto.");
        setStatusType("error");
      }
    } catch {
      setStatusMessage("Error al validar PIN actual.");
      setStatusType("error");
    } finally {
      setIsValidatingOld(false);
    }
  };

  const changePin = async (newPin: string) => {
    resetStatus();
    setLoadingSubmit(true);

    try {
      const response = await fetch("/api/pin6/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedClient?.id,
          pin_code: newPin,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setStatusMessage(result.message || "Hubo un error al cambiar el PIN.");
        setStatusType("error");
        return false;
      }

      setStatusMessage("PIN cambiado correctamente.");
      setStatusType("success");
      return true;
    } catch {
      setStatusMessage("Error al enviar cambios.");
      setStatusType("error");
      return false;
    } finally {
      setLoadingSubmit(false);
    }
  };

  return {
    isValidatingOld,
    isOldPinValid,
    statusMessage,
    statusType,
    loadingSubmit,
    validateOldPin,
    changePin,
    resetStatus,
    setIsOldPinValid,
  };
}
