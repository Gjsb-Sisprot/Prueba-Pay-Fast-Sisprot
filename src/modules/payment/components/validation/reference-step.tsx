"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useClientStore } from "@/shared/lib/store/client-store";
import { Clipboard } from "lucide-react";

interface PaymentReferenceStepProps {
  paymentMethod?: string;
}

export function PaymentReferenceStep({
  paymentMethod,
}: PaymentReferenceStepProps = {}) {
  const { referenceNumber, setReferenceNumber, setValidationStep } =
    useClientStore();

  const [localReference, setLocalReference] = useState(referenceNumber);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (paymentMethod === "zelle") {
        // Para Zelle permitir letras y números, remover solo espacios y caracteres especiales
        const cleanText = text.replace(/[^a-zA-Z0-9]/g, "");
        setLocalReference(cleanText);
      } else {
        // Solo conservar números para otros métodos
        const numbersOnly = text.replace(/\D/g, "");
        setLocalReference(numbersOnly);
      }
    } catch (err) {
      console.error("Error al pegar:", err);
    }
  };

  const handleInputChange = (value: string) => {
    if (paymentMethod === "zelle") {
      // Para Zelle permitir letras y números
      const alphanumericOnly = value.replace(/[^a-zA-Z0-9]/g, "");
      setLocalReference(alphanumericOnly);
    } else {
      // Solo permitir números para otros métodos
      const numbersOnly = value.replace(/\D/g, "");
      setLocalReference(numbersOnly);
    }
  };

  const handleConfirm = () => {
    setReferenceNumber(localReference);
    // Para Zelle ir a titular de cuenta, para transferencia/pago móvil ir a banco
    // ya que el cliente debe seleccionar desde qué banco realizó el pago
    const nextStep = paymentMethod === "zelle" ? "account-holder" : "bank";
    setValidationStep(nextStep);
  };

  const canConfirm = localReference.length >= 4;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-center px-2">
        <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-3 leading-tight">
          Ingresa el N° de referencia
        </h3>

        <div className="bg-blue-50 p-3 sm:p-4 rounded-xl border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
              ℹ
            </div>
            <p className="text-sm sm:text-base text-blue-800 text-left">
              {paymentMethod === "zelle"
                ? "Asegúrate de escribir todos los caracteres (números y letras)."
                : "Asegúrate de escribir todos los dígitos."}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4 px-2">
        <div className="relative">
          <Input
            type="text"
            placeholder={
              paymentMethod === "zelle"
                ? "N° de referencia o ID de transacción"
                : "N° de referencia"
            }
            value={localReference}
            maxLength={paymentMethod === "zelle" ? undefined : 20}
            onChange={(e) => handleInputChange(e.target.value)}
            className="text-center text-lg sm:text-xl font-semibold h-16 sm:h-14 pr-20 rounded-xl text-gray-900 placeholder:text-gray-400"
            inputMode={paymentMethod === "zelle" ? "text" : "numeric"}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePaste}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 font-semibold text-sm px-2 py-1 h-auto rounded-lg"
          >
            <Clipboard className="h-4 w-4 mr-1" />
            <span className="hidden xs:inline">Pegar</span>
          </Button>
        </div>

        <p className="text-xs sm:text-sm text-gray-500 text-center px-2 leading-relaxed">
          {paymentMethod === "zelle" ? (
            <>
              Está en el comprobante de Zelle y puede llamarse ID de
              transacción, N° de confirmación o N° de referencia. Puede contener
              números y letras.
            </>
          ) : (
            <>
              Está en el comprobante de pago que te generó el banco y puede
              llamarse N° de operación o N° de referencia. Si no lo encuentras,
              puedes buscarlo en tu cuenta bancaria.
            </>
          )}
        </p>
      </div>

      <div className="flex gap-3 pt-3 px-2">
        <Button
          variant="outline"
          onClick={() => setValidationStep(null)}
          className="flex-1 h-12 font-black text-sm rounded-xl"
        >
          Paso anterior
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="flex-1 h-12 font-black text-sm rounded-xl disabled:opacity-50"
        >
          Confirmar número
        </Button>
      </div>
    </div>
  );
}
