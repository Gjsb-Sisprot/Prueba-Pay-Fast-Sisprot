"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { LoaderCircleIcon, MessageSquare, Mail, Shield } from "lucide-react";
import React from "react";

interface Pin6ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  mobile: string;
  email: string;
}

// Función para enmascarar número de teléfono
const maskPhoneNumber = (phone: string): string => {
  if (!phone || phone.length < 8) return phone;
  // Formato: 0424******123 (mantener primeros 4 y últimos 3)
  const start = phone.slice(0, 4);
  const end = phone.slice(-3);
  const middle = "*".repeat(Math.max(0, phone.length - 7));
  return `${start}${middle}${end}`;
};

// Función para enmascarar email
const maskEmail = (email: string): string => {
  if (!email || !email.includes("@")) return email;
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) return email;

  // Mostrar primeros 2 caracteres + ****** + últimos caracteres antes del @
  const visibleStart = localPart.slice(0, 2);
  const visibleEnd = localPart.slice(-2);
  const maskedLocal = `${visibleStart}${"*".repeat(6)}${visibleEnd}`;

  return `${maskedLocal}@${domain}`;
};

export function Pin6ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  mobile,
  email,
}: Pin6ConfirmationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  const handleConfirm = async () => {
    // Prevenir múltiples envíos - verificar inmediatamente
    if (isLoading || hasAttempted) {
      return;
    }

    // Marcar inmediatamente que se ha intentado enviar
    setHasAttempted(true);
    setIsLoading(true);

    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
      // No resetear hasAttempted para mantener el botón deshabilitado
    }
  };

  // Resetear estado cuando se abre el modal
  React.useEffect(() => {
    if (isOpen) {
      setHasAttempted(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Solo permitir cerrar si no se está cargando y no se ha enviado solicitud
        if (!open && !isLoading && !hasAttempted) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-lg md:max-w-xl max-h-[95vh] overflow-y-auto"
        onInteractOutside={(e: Event) => {
          // Prevenir cerrar si se está cargando o ya se envió solicitud
          if (isLoading || hasAttempted) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <div className="w-14 h-14 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-7 h-7 sm:w-6 sm:h-6 text-blue-600 " />
            </div>
          </div>
          <DialogTitle className="text-center text-xl sm:text-xl font-black text-gray-900 px-2">
            Verificación de Seguridad PIN6
          </DialogTitle>
          <DialogDescription asChild className="text-center">
            <div>
              <p className="text-sm sm:text-sm text-gray-700  px-2 sm:px-0 leading-relaxed">
                Para garantizar la seguridad de su transacción, se enviará un
                código de verificación PIN6 a sus datos de contacto registrados.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 sm:space-y-2">
          {/* Información de contacto */}
          <div className="space-y-3 sm:space-y-3">
            <h4 className="text-base sm:text-sm font-semibold text-gray-900 text-center px-2">
              Destinos de envío confirmados:
            </h4>

            <div className="space-y-3 sm:space-y-2">
              <div className="flex items-center gap-3 p-4 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
                <MessageSquare className="h-6 w-6 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-base sm:text-sm font-semibold text-blue-900">
                    Mensaje de Texto
                  </div>
                  <div className="text-sm sm:text-sm text-blue-800 font-mono break-all">
                    {maskPhoneNumber(mobile)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                <Mail className="h-6 w-6 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-base sm:text-sm font-semibold text-green-900">
                    Correo Electrónico
                  </div>
                  <div className="text-sm sm:text-sm text-green-800 font-mono break-all">
                    {maskEmail(email)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mensaje informativo */}
          <div className="bg-amber-50 p-4 sm:p-4 rounded-lg border border-amber-200 space-y-3">
            <div className="space-y-4 sm:space-y-3">
              <p className="text-sm sm:text-sm text-amber-800 leading-relaxed">
                <span className="font-semibold">Tiempo de entrega:</span> El
                código PIN6 será enviado en los próximos 2-5 minutos. Por favor,
                revise su bandeja de entrada y mensajes de texto.
              </p>

              <div className="border-t border-amber-200 pt-4 sm:pt-3">
                <p className="text-sm sm:text-sm text-amber-800 leading-relaxed mb-3">
                  <span className="font-semibold">
                    ¿Necesita asistencia técnica?
                  </span>
                  <br />
                  Si experimenta dificultades para recibir el código o su número
                  telefónico no corresponde a Venezuela 🇻🇪, nuestro equipo de
                  soporte técnico está disponible para brindarle asistencia
                  inmediata.
                </p>

                <div className="mt-3 p-3 sm:p-3 bg-white rounded-md border border-amber-300">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2">
                    <div className="flex-1">
                      <p className="text-sm sm:text-sm font-semibold text-amber-900">
                        Centro de Atención al Cliente
                      </p>
                      <p className="text-xs sm:text-xs text-amber-700">
                        Soporte vía WhatsApp - Disponible 24/7
                      </p>
                    </div>
                    <a
                      href="https://wa.me/584120261134?text=Hola,%20necesito%20asistencia%20con%20el%20código%20PIN6%20para%20validar%20mi%20pago.%20Mi%20número%20de%20identificación%20es%20[AGREGAR_SU_ID]."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 sm:px-3 sm:py-2 rounded-md text-sm sm:text-sm font-medium transition-colors w-full sm:w-auto"
                    >
                      <MessageSquare className="h-4 w-4" />
                      0412-0261134
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-3 ">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading || hasAttempted}
              className="w-full sm:flex-1 h-14 sm:h-12 font-black text-base sm:text-base order-2 sm:order-1"
            >
              {hasAttempted ? "Esperando código..." : "Cancelar proceso"}
            </Button>
            {/* Confirm button: more prominent styling when enabled */}
            <Button
              onClick={handleConfirm}
              disabled={isLoading || hasAttempted}
              className={`w-full sm:flex-1 h-14 sm:h-12 font-black text-base sm:text-base order-1 sm:order-2 transition-transform transform-gpu ${
                isLoading || hasAttempted
                  ? 'opacity-60 cursor-not-allowed bg-gray-200 dark:bg-slate-700 text-muted-foreground'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl hover:scale-105'
              }`}
            >
              {isLoading ? (
                <>
                  <LoaderCircleIcon
                    className="-ms-1 me-2 animate-spin"
                    size={16}
                  />
                  Enviando código...
                </>
              ) : hasAttempted ? (
                <>
                  <Shield className={`-ms-1 me-2 ${isLoading || hasAttempted ? '' : 'animate-bounce-slow'}`} size={16} />
                  Código enviado
                </>
              ) : (
                <>
                  <Shield className={`-ms-1 me-2  ${isLoading || hasAttempted ? '' : 'w-22 h-22 animate-bounce-slow'}`} size={16} />
                  Enviar Solicitud PIN6
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
