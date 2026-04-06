"use client";

import { AlertTriangle, Phone } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useClientStore } from "@/shared/lib/store/client-store";

interface PaymentResultErrorProps {
  message?: string;
  statusCode?: number;
}

export function PaymentResultError({}: PaymentResultErrorProps) {
  const { clearSearch } = useClientStore();

  const handleCallCenter = () => {
    // Abrir la aplicación de teléfono con el número del call center
    window.location.href = "tel:584120261134";
  };

  const handleGoToStart = () => {
    // Resetear completamente todo el estado y volver al formulario inicial
    clearSearch();
  };

  return (
    <div className="space-y-6 max-w-md mx-auto text-center">
      {/* Error Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-12 h-12 text-red-600" />
        </div>
      </div>

      {/* Header */}
      <div className="space-y-3">
        <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
          Error del servidor
        </h3>
        <p className="text-sm sm:text-base text-gray-600">
          Ha ocurrido un problema técnico en nuestros servidores.
        </p>
      </div>

      {/* Error Details */}
      <div className="bg-red-50 p-4 rounded-xl border border-red-200 space-y-3">
        <p className="text-sm text-red-800 font-medium">
          Por favor, intenta nuevamente más tarde o contacta a nuestro call
          center para asistencia inmediata.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-4">
        <Button
          onClick={handleCallCenter}
          className="w-full h-14 font-black text-base rounded-xl bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-2"
        >
          <Phone className="w-5 h-5" />
          Llamar Call Center
          <span className="text-sm font-normal">584120261134</span>
        </Button>

        <Button
          onClick={handleGoToStart}
          variant="outline"
          className="w-full h-12 font-medium text-sm rounded-xl"
        >
          Intentar más tarde
        </Button>
      </div>
    </div>
  );
}
