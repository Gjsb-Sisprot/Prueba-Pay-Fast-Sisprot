"use client";

import { Clock, AlertCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useClientStore } from "@/shared/lib/store/client-store";
import { PaymentSatisfactionSurvey } from "@/modules/payment/components/payment-satisfaction-survey";
import { useEffect, useRef } from "react";
import { fetchContractsByClient } from "@/modules/contracts/hooks/use-contracts";

interface PaymentResultVerificationProps {
  message?: string;
  statusCode?: number;
}

export function PaymentResultVerificationDebt({}: PaymentResultVerificationProps) {
  const {
    goContract,
    showSurvey,
    setShowSurvey,
    processDuration,
    endProcess,
    selectedClient,
    setContractsResult,
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

    // Re-consultar los contratos del cliente antes de volver al inicio
    const clientId = selectedClient?.id;
    if (clientId) {
      (async () => {
        try {
          const contractsData = (await fetchContractsByClient(clientId)) as Parameters<typeof setContractsResult>[0];
          setContractsResult(contractsData);
        } catch (error) {
          console.error("Error fetching contracts on verification close:", error);
          setContractsResult(null);
        } finally {
          // Volver al inicio tras un pequeño delay para cerrar la encuesta primero
          setTimeout(() => {
            goContract();
          }, 100);
        }
      })();
    } else {
      // Si no hay cliente seleccionado, simplemente volver
      setTimeout(() => {
        goContract();
      }, 100);
    }
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
            Pago en verificación
          </h3>
          <p className="text-sm sm:text-base text-gray-600">
            Tu pago ha sido recibido y está siendo verificado por nuestro
            equipo.
          </p>
        </div>

        {/* Verification Details */}
        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 space-y-3">
          <div className="flex items-center justify-center gap-2 text-yellow-800">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">
              Proceso de verificación en curso
            </p>
          </div>
          <p className="text-sm text-yellow-700">
            <span className="font-bold">
              Este proceso puede tomar unos minutos.
            </span>
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
