"use client";

import { Clock } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useClientStore } from "@/shared/lib/store/client-store";
import { PaymentSatisfactionSurvey } from "@/modules/payment/components/payment-satisfaction-survey";
import { useEffect, useRef } from "react";

interface AutomaticPaymentResultProps {
  message?: string;
  statusCode?: number;
}

export function AutomaticPaymentResult({message}: AutomaticPaymentResultProps) {
  const {
    clearSearch,
    showSurvey,
    setShowSurvey,
    processDuration,
    endProcess,
  } = useClientStore();

  // Ref para evitar que endProcess se ejecute múltiples veces
  const hasProcessEnded = useRef(false);

  // useEffect separado para endProcess (se ejecuta solo una vez)
  useEffect(() => {
    if (!hasProcessEnded.current) {
      endProcess();
      hasProcessEnded.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sin dependencias para que se ejecute solo una vez

  // useEffect separado para mostrar la encuesta (se ejecuta solo cuando no está visible)
  useEffect(() => {
    if (!showSurvey) {
      setShowSurvey(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sin dependencias, se ejecuta solo al montar el componente

  const handleGoToStart = () => {
    // Si la encuesta está abierta, cerrarla primero
    if (showSurvey) {
      setShowSurvey(false);
    }

    // Resetear completamente todo el estado y volver al formulario inicial
    setTimeout(() => {
      clearSearch();
    }, 100); // Small delay to ensure survey closes first
  };

  const handleCloseSurvey = () => {
    setShowSurvey(false);
  };

  return (
    <>
      <div className="space-y-6 max-w-md mx-auto text-center">
        {/* Verification Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
            <Clock className="w-12 h-12 text-yellow-600" />
          </div>
        </div>

        {/* Header */}
        <div className="space-y-3">
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
           Resultado del Pago
          </h3>
          <p className="text-sm sm:text-base text-gray-600">
            {message}
          </p>
        </div>



        {/* Action Button */}
        <div className="pt-4">
          <Button
            onClick={handleGoToStart}
            className="w-full h-14 font-black text-base rounded-xl bg-yellow-600 text-white hover:bg-yellow-700"
          >
            Entendido, volver al inicio
          </Button>
        </div>
      </div>

      {/* Survey Modal */}
      <PaymentSatisfactionSurvey
        isOpen={showSurvey}
        onClose={handleCloseSurvey}
        processDuration={Math.round(processDuration)}
      />
    </>
  );
}
