"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Edit2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useClientStore } from "@/shared/lib/store/client-store";

interface PaymentConfirmationStepProps {
  paymentMethod?: string;
}

export function PaymentConfirmationStep({
  paymentMethod,
}: PaymentConfirmationStepProps = {}) {
  const {
    referenceNumber,
    selectedBank,
    accountHolder,
    paymentDate,
    transferredAmount,
    setValidationStep,
  } = useClientStore();

  const handleEdit = (
    step: "reference" | "bank" | "account-holder" | "date" | "amount"
  ) => {
    setValidationStep(step);
  };

  // Determinar configuraciones según método de pago
  const isZelle = paymentMethod === "zelle";
  const currencySymbol = isZelle ? "$" : "Bs";
  const bankOrAccountLabel = isZelle ? "Titular de cuenta" : "Banco de origen";
  const bankOrAccountValue = isZelle
    ? accountHolder || "No ingresado"
    : selectedBank?.name || "No seleccionado";
  // Para Zelle permitir editar titular, para otros métodos permitir editar banco de origen
  const bankOrAccountEditStep = isZelle ? "account-holder" : "bank";

  const handleConfirmPayment = () => {
    // Ir al paso de subida de comprobante
    setValidationStep("receipt");
  };

  // Formatear el monto para mostrar con separadores de miles
  const formatAmount = (amount: string) => {
    if (!amount) return "0,00";

    const parts = amount.split(".");
    let integerPart = parts[0];

    // Agregar separadores de miles
    if (integerPart.length > 3) {
      integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    // Reconstruir con coma decimal si hay decimales
    if (parts.length === 2 && parts[1]) {
      return `${integerPart},${parts[1]}`;
    }

    return integerPart;
  };

  // Formatear la fecha para mostrar
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString + "T00:00:00"), "dd/MM/yyyy", {
        locale: es,
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center px-2">
        <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 leading-tight">
          Confirma los datos del pago
        </h3>
        <p className="text-sm sm:text-base text-gray-600">
          Revisa que todos los datos sean correctos antes de continuar.
        </p>
      </div>

      {/* Data Fields */}
      <div className="space-y-4 px-4">
        {/* Fecha */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm text-gray-500 font-medium">Fecha</p>
            <p className="text-lg font-black text-gray-900">
              {formatDate(paymentDate)}
            </p>
          </div>
          <button
            onClick={() => handleEdit("date")}
            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Edit2 size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Banco / Titular de cuenta */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div className="flex-1">
            <p className="text-sm text-gray-500 font-medium">
              {bankOrAccountLabel}
            </p>
            <p className="text-lg font-black text-gray-900">
              {bankOrAccountValue}
            </p>
            {!isZelle && (
              <p className="text-xs text-gray-400 mt-1">
                Banco desde donde realizaste el pago
              </p>
            )}
          </div>
          <button
            onClick={() => handleEdit(bankOrAccountEditStep)}
            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Edit2 size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Monto */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm text-gray-500 font-medium">Monto</p>
            <p className="text-lg font-black text-gray-900">
              {currencySymbol} {formatAmount(transferredAmount)}
            </p>
          </div>
          <button
            onClick={() => handleEdit("amount")}
            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Edit2 size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Número de referencia */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm text-gray-500 font-medium">
              Número de referencia
            </p>
            <p className="text-lg font-black text-gray-900">
              {referenceNumber || "No ingresado"}
            </p>
          </div>
          <button
            onClick={() => handleEdit("reference")}
            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Edit2 size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 px-4 pt-4">
        <Button
          variant="outline"
          onClick={() => setValidationStep("amount")}
          className="flex-1 h-12 font-black text-sm rounded-xl"
        >
          Paso anterior
        </Button>
        <Button
          onClick={handleConfirmPayment}
          className="flex-1 h-14 font-black text-base rounded-xl bg-black text-white hover:bg-gray-800"
          disabled={
            !referenceNumber ||
            (isZelle ? !accountHolder : !selectedBank) ||
            !paymentDate ||
            !transferredAmount
          }
        >
          Continuar al comprobante
        </Button>
      </div>
    </div>
  );
}
