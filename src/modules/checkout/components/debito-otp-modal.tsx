"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { OTPInput, SlotProps, REGEXP_ONLY_DIGITS } from "input-otp";
import { Button } from "@/shared/components/ui/button";
import { X, Clock, Loader2 } from "lucide-react";
import useValidateDebit from "@/modules/payment/hooks/use-validate-debit";
import useDebit from "@/modules/payment/hooks/use-debit";
import type { DebitInvoice, DebitApiResponse } from "@/shared/types/debit";

interface DebitoInmediatoOTPModalProps {
  open: boolean;
  onClose: () => void;
  // onSubmit now receives the result of validateOtp (or a fallback object)
  // When getPayload is not provided the modal can return a lightweight fallback
  // that contains the token so callers can handle it. Otherwise it returns
  // the API response shape `DebitApiResponse`.
  onSubmit: (result: DebitApiResponse | { token: string; fallback: true }) => void;
  // Función que retorna el payload base (sin token). El modal añadirá `token`.
  getPayload?: () => DebitInvoice;
  phoneNumber: string;
}

export function DebitoInmediatoOTPModal({
  open,
  onClose,
  onSubmit,
  phoneNumber,
  getPayload,
}: DebitoInmediatoOTPModalProps) {
  const [otpCode, setOtpCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutos = 120 segundos
  const [isExpired, setIsExpired] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { validateOtp, loading: validating } = useValidateDebit<DebitApiResponse>();
  const { requestOtp, loading: requesting } = useDebit<DebitApiResponse>();
  const [errorMessage, setErrorMessage] = useState("");
  

  const handleClose = useCallback(() => {
    setErrorMessage("");
    onClose();
  }, [onClose]);

  // Reiniciar el contador y limpiar cuando se abra el modal
  useEffect(() => {
    if (open) {
      setTimeLeft(120);
      setIsExpired(false);
      setOtpCode("");
      setErrorMessage("");
      // Enfocar el input del código (primer slot)
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Contador regresivo
  useEffect(() => {
    if (!open || isExpired) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, isExpired]);

  // Cerrar con tecla Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, handleClose]);

  if (!open) return null;

  // Formatear el tiempo restante como MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmit = () => {
    (async () => {
      if (otpCode.length !== 8 || isExpired) return;
      setErrorMessage("");
      // Si no hay getPayload, fallback: devolver el token en un objeto
      if (!getPayload) {
        onSubmit({ token: otpCode, fallback: true });
        setOtpCode("");
        return;
      }

      const base = getPayload();
      const payload: DebitInvoice = { ...base, token: otpCode };
      console.log("Payload para validar OTP:", payload);

      try {
        setErrorMessage("");
        const result = await validateOtp(payload as DebitInvoice);
        // Devolver al padre el resultado de la validación para que pueda continuar el flujo
        onSubmit(result);
        setOtpCode("");
        handleClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg || "Error al verificar el código");
      }
    })();
  };

  const handleResendCode = () => {
    (async () => {
      setErrorMessage("");
      // Si no hay getPayload, solo reiniciar UI
      if (!getPayload) {
        setTimeLeft(120);
        setIsExpired(false);
        setOtpCode("");
        inputRef.current?.focus();
        return;
      }

      const base = getPayload();
      try {
        await requestOtp(base);
        // éxito: reiniciar contador y foco
        setTimeLeft(120);
        setIsExpired(false);
        setOtpCode("");
        inputRef.current?.focus();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg || "Error al reenviar el código");
      }
    })();
  };


  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) handleClose();
      }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200 relative">
        {/* Botón cerrar */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X size={24} />
        </button>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-3">
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Código de Verificación
          </h3>
          <p className="text-gray-600 text-sm">
            Su banco enviará un código OTP al número
          </p>
          <p className="text-gray-900 font-semibold text-base mt-1">
            {phoneNumber}
          </p>
        </div>
        {/* Contador */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <Clock className={`w-5 h-5 ${isExpired ? "text-red-500" : "text-blue-600"}`} />
            <span
              className={`text-2xl font-bold ${
                isExpired ? "text-red-500" : "text-blue-600"
              }`}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
          {isExpired && (
            <p className="text-red-500 text-sm mt-2 font-medium">
              El código ha expirado
            </p>
          )}
        </div>

        {errorMessage && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded">
            {errorMessage}
          </div>
        )}

        {/* Input del código OTP (estilo PIN6) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ingresa el código de 8 dígitos
          </label>
          <div className="flex justify-center">
            <OTPInput
              value={otpCode}
              onChange={(val) => setOtpCode(val)}
              ref={inputRef}
              maxLength={8}
              disabled={isExpired}
              render={({ slots }) => (
                <div className="flex gap-2">
                  {slots.map((slot, idx) => (
                    <PinSlot key={idx} {...slot} />
                  ))}
                </div>
              )}
              pattern={REGEXP_ONLY_DIGITS}
            />
          </div>
          {otpCode.length > 0 && otpCode.length < 8 && (
            <p className="text-gray-500 text-xs mt-2 text-center">
              {8 - otpCode.length} dígito{8 - otpCode.length > 1 ? "s" : ""} restante
            </p>
          )}
        </div>

        {/* Botones */}
        <div className="space-y-3">
          <Button
            onClick={handleSubmit}
            disabled={otpCode.length !== 8 || isExpired || validating}
            className="w-full h-12 font-semibold text-base"
          >
            {validating ? (
              <span className="flex items-center justify-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verificando...
              </span>
            ) : (
              "Verificar Código"
            )}
          </Button>

          {isExpired && (
            <Button
              onClick={handleResendCode}
              variant="outline"
              className="w-full h-12 font-semibold text-base"
              disabled={requesting}
            >
              {requesting ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Solicitando...
                </span>
              ) : (
                "Reenviar Código"
              )}
            </Button>
          )}
        </div>

        {/* Nota adicional */}
        <p className="text-gray-500 text-xs text-center mt-4">
          ¿No recibiste el código? Verifica tu número de teléfono o solicita uno nuevo
        </p>
      </div>
    </div>
  );
}

function PinSlot(props: SlotProps) {
  return (
    <div
      className={
        "border-input bg-background flex size-10 items-center justify-center rounded-md border text-lg font-bold shadow-xs transition-colors " +
        (props.isActive ? "border-blue-500" : "border-gray-400")
      }
    >
      {props.char !== null && <div>{props.char}</div>}
    </div>
  );
}
