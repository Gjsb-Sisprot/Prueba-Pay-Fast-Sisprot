"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { CheckCircle, Loader2 } from "lucide-react";
import { useOtp } from "../hooks/use-otp";
import { CommunicationMethod } from "../services/otp-service";

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: () => void;
  email: string;
  type?: CommunicationMethod;
}

export function OtpVerificationModal({
  isOpen,
  onClose,
  onVerify,
  email,
  type = "email",
}: OtpVerificationModalProps) {
  const [otp, setOtp] = useState("");
  const { validateOtp, generateOtp, loading, error: otpError, setError } = useOtp();
  const [timer, setTimer] = useState(180);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, timer]);

  useEffect(() => {
    if (isOpen) {
      setTimer(60);
    }
  }, [isOpen]);

  const handleResend = async () => {
    const success = await generateOtp(type || "email", email);
    if (success) {
      setTimer(60);
      setError("");
    }
  };

  const handleVerify = async () => {
    if (otp.length >= 4) {
      const result = await validateOtp(otp, type);
      if (result) {
        onVerify();
        setOtp("");
        onClose();
      }
    } else {
      setError("El código OTP debe tener 4 o mas caracteres.");
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            {type === "email"
              ? "Verificación de Correo"
              : "Verificación de Teléfono"}
          </DialogTitle>
          <DialogDescription>
            Hemos enviado un código de confirmacion al{" "}
            {type === "email" ? "correo" : "teléfono"}:{" "}
            <span className="font-semibold text-gray-900">{email}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          <Input
            type="text"
            maxLength={6}
            placeholder="00aBd1"
            className="text-center text-2xl tracking-widest font-mono w-48 h-14"
            value={otp}
            onChange={(e) => {
              const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
              setOtp(val);
              setError("");
            }}
            disabled={loading}
          />
          {otpError && <p className="text-sm text-red-500">{otpError}</p>}
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-center text-gray-500 max-w-xs">
              {type === "email"
                ? "Ingrese el código recibido en su bandeja de entrada o spam para verificar su dirección de correo electrónico."
                : "Ingrese el código SMS recibido en su dispositivo móvil para verificar su número de teléfono."}
            </p>
            
            <div className="flex flex-col items-center gap-1">
              {timer > 0 ? (
                <p className="text-xs text-gray-400">
                  Podrás solicitar un nuevo código en {timer}s
                </p>
              ) : (
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-blue-600 font-bold h-auto p-0"
                >
                  Reenviar código
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-center">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleVerify}
            disabled={loading || otp.length < 4}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              "Verificar Código"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
