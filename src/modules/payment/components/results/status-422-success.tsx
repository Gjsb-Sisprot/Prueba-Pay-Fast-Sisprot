"use client";

import { CheckCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useClientStore } from "@/shared/lib/store/client-store";
import { PaymentSatisfactionSurvey } from "@/modules/payment/components/payment-satisfaction-survey";
import { useEffect, useRef } from "react";

interface PaymentResultSuccessProps {
  message?: string;
}

export function Status422Success({}: PaymentResultSuccessProps) {
  const {
    showSurvey,
    setShowSurvey,
    processDuration,
    endProcess,
    goContract
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


  const handleCloseSurvey = () => {
    setShowSurvey(false);
  };

  return (
    <>
      <div className="space-y-6 max-w-md mx-auto text-center">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>

        {/* Header */}
        <div className="space-y-3">
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
            ¡Pago procesado exitosamente!
          </h3>
          <p className="text-sm sm:text-base text-gray-600">
            Tu pago ha sido validado y registrado correctamente en nuestro
            sistema.
          </p>
        </div>

        {/* Success Details */}
        <div className="bg-green-50 p-4 rounded-xl border border-green-200">
          <p className="text-sm text-green-800 font-medium">
            Tu servicio ha sido reactivado y puedes continuar disfrutando de
            nuestros servicios.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <Button
            onClick={goContract}
            className="w-full h-14 font-black text-base rounded-xl bg-green-600 text-white hover:bg-green-700"
          >
            Volver al inicio
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
