"use client";

import { CheckCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useClientStore } from "@/shared/lib/store/client-store";
import { PaymentSatisfactionSurvey } from "@/modules/payment/components/payment-satisfaction-survey";
import {  useEffect, useRef, useState } from "react";
import { PaymentAfiliationModal } from "@/modules/methods/components/crud-affiliated-methods/afiliation-method-modal";
import { fetchContractsByClient } from "@/modules/contracts/hooks/use-contracts";

interface PaymentResultSuccessProps {
  message?: string;
}

export function PaymentResultSuccess({}: PaymentResultSuccessProps) {
  const {
    goContract,
    showSurvey,
    setShowSurvey,
    processDuration,
    endProcess,
    selectedClient,
    selectedPaymentMethod,
    setContractsResult,
  } = useClientStore();

  const [modal, setModal] = useState(false);
  const hasProcessEnded = useRef(false);
  const hasOpenedModal = useRef(false);

  // ✅ Reinicia refs cada vez que cambia el cliente o método (nuevo pago)
  useEffect(() => {
    hasProcessEnded.current = false;
    hasOpenedModal.current = false;
    setModal(false);
    setShowSurvey(false);
  }, [selectedClient, selectedPaymentMethod, setShowSurvey]);

  // ✅ Flujo principal: finaliza proceso y abre modal tras 1s
  useEffect(() => {
    if (!hasProcessEnded.current) {
      endProcess();
      hasProcessEnded.current = true;

      const timer = setTimeout(() => {
        setModal(true);
        hasOpenedModal.current = true;
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [endProcess]);

  // ✅ Cuando el modal se cierra y ya fue abierto → muestra encuesta
  useEffect(() => {
    if (hasOpenedModal.current && !modal) {
      const timer = setTimeout(() => {
        setShowSurvey(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [modal, setShowSurvey]);

  const handleGoToStart = () => {
    if (showSurvey) setShowSurvey(false);

    // Re-consultar los contratos del cliente antes de volver al inicio
    const clientId = selectedClient?.id;
    if (clientId) {
      (async () => {
        try {
          const contractsData = (await fetchContractsByClient(clientId)) as Parameters<typeof setContractsResult>[0];
          setContractsResult(contractsData);
        } catch (error) {
          console.error("Error fetching contracts on success close:", error);
          setContractsResult(null);
        } finally {
          setTimeout(() => {
            goContract();
          }, 100);
        }
      })();
    } else {
      setTimeout(() => {
        goContract();
      }, 100);
    }
  };

  useEffect(() => {
    const clientIdAtMount = selectedClient?.id;
    if (!clientIdAtMount) return;

    const load = async () => {
      try {
        const contractsData = await fetchContractsByClient(clientIdAtMount) as Parameters<typeof setContractsResult>[0];
        setContractsResult(contractsData);
      } catch (error) {
        console.error("Error fetching contracts:", error);
        setContractsResult(null);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCloseSurvey = () => setShowSurvey(false);

  return (
    <>
      <div className="space-y-6 max-w-md mx-auto text-center">
        {/* ✅ Ícono de éxito */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>

        {/* ✅ Encabezado */}
        <div className="space-y-3">
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
            ¡Pago procesado exitosamente!
          </h3>
          <p className="text-sm sm:text-base text-gray-600">
            Tu pago ha sido validado y registrado correctamente en nuestro sistema.
          </p>
        </div>

        {/* ✅ Detalle */}
        <div className="bg-green-50 p-4 rounded-xl border border-green-200">
          <p className="text-sm text-green-800 font-medium">
            Tu servicio ha sido reactivado y puedes continuar disfrutando de nuestros servicios.
          </p>
        </div>

        {/* ✅ Botón Volver */}
        <div className="pt-4 flex flex-row gap-3">
          <Button
            onClick={handleGoToStart}
            className="w-full h-14 font-black text-base rounded-xl bg-green-600 text-white hover:bg-green-700"
          >
            Volver al inicio
          </Button>
        </div>
      </div>

      {/* 🔹 Modal de afiliación */}
      <PaymentAfiliationModal
        client={selectedClient?.id}
        open={modal}
        onClose={() => setModal(false)}
      />

      {/* 🔹 Encuesta */}
      <PaymentSatisfactionSurvey
        isOpen={showSurvey}
        onClose={handleCloseSurvey}
        processDuration={Math.round(processDuration)}
      />
    </>
  );
}
