"use client";

import { Button } from "@/shared/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Contract } from "@/shared/lib/api-client";

interface PaymentData {
  label: string;
  value: string;
}

interface PaymentDataDisplayProps {
  paymentMethod: string;
  amount: string;
  dollarAmount?: string;
  selectedContract: Contract | null;
  onPaymentCompleted: () => void;
  onGoBack: () => void;
}

// Constantes para Zelle (siempre los mismos datos)
const ZELLE_DATA = {
  titular: "Sisprot Global Fiber LLC",
  email: "sisprotgf22@gmail.com",
  bank: "Bank Of America",
};

// Función para obtener datos de pago dinámicos basados en el contrato seleccionado
const getPaymentData = (
  method: string,
  amount: string,
  dollarAmount: string | undefined,
  contract: Contract | null
): PaymentData[] => {
  if (!contract || !contract.bank_associated) {
    // Fallback si no hay contrato o datos bancarios
    return [
      {
        label: "Error",
        value: "No se encontraron datos bancarios del contrato",
      },
    ];
  }

  const { bank_associated } = contract;

  switch (method) {
    case "pago-movil":
      return [
        { label: "Monto", value: `Bs ${amount}` },
        { label: "Teléfono", value: bank_associated.rlf },
        { label: "Cédula", value: bank_associated.identification },
        { label: "Banco", value: bank_associated.bank_name },
      ];

    case "zelle":
      // Usar el monto en dólares del API si está disponible
      const zelleAmount = dollarAmount
        ? `$${parseFloat(dollarAmount).toFixed(2)}`
        : `$${(parseFloat(amount.replace(/,/g, "")) / 37).toFixed(2)}`;

      return [
        { label: "Monto", value: zelleAmount },
        { label: "Email", value: ZELLE_DATA.email },
        { label: "Titular", value: ZELLE_DATA.titular },
        { label: "Banco", value: ZELLE_DATA.bank },
      ];

    default: // transferencia
      return [
        { label: "Monto", value: `Bs ${amount}` },
        { label: "Cuenta", value: bank_associated.nro_cta },
        { label: "RIF", value: bank_associated.identification },
        { label: "Tipo", value: "Corriente" },
        { label: "Banco", value: bank_associated.bank_name },
      ];
  }
};

export function PaymentDataDisplay({
  paymentMethod,
  amount,
  dollarAmount,
  selectedContract,
  onPaymentCompleted,
  onGoBack,
}: PaymentDataDisplayProps) {
  const [copiedFields, setCopiedFields] = useState<Set<string>>(new Set());
  const paymentData = getPaymentData(
    paymentMethod,
    amount,
    dollarAmount,
    selectedContract
  );

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFields(new Set([...copiedFields, field]));

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedFields((prev) => {
          const newSet = new Set(prev);
          newSet.delete(field);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error("Error al copiar:", err);
    }
  };

  const getMethodTitle = (method: string) => {
    switch (method) {
      case "pago-movil":
        return "Pago Móvil";
      case "transferencia":
        return "Transferencia";
      case "zelle":
        return "Zelle";
      case "debito-inmediato":
        return "Débito Inmediato";
      default:
        return "Transferencia";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-4">
      <div className="text-center">
        <h3 className="text-xl sm:text-lg font-black text-gray-900 mb-2 px-2">
          Verificación de pago
        </h3>
      </div>

      <div className="bg-blue-50 p-4 sm:p-4 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-7 h-7 sm:w-6 sm:h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm sm:text-xs font-bold">
            1
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-1 text-base sm:text-sm leading-relaxed">
              Copia los datos y asegúrate de pagar correctamente en tu banco.
            </h4>
            <p className="text-sm sm:text-sm text-blue-800 leading-relaxed">
              Las agencias tienen datos bancarios únicos.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-4">
        <h4 className="text-lg sm:text-base font-semibold text-gray-900 px-2 sm:px-0">
          {getMethodTitle(paymentMethod)} a esta cuenta
        </h4>

        <div className="space-y-3 sm:space-y-3">
          {paymentData.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 sm:p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="text-sm sm:text-sm text-gray-600 mb-1 font-medium">
                  {item.label}
                </div>
                <div className="font-semibold text-gray-900 break-all text-base sm:text-sm leading-relaxed">
                  {item.value}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 p-3 sm:p-2 h-auto"
                onClick={() => copyToClipboard(item.value, item.label)}
                aria-label={`Copiar ${item.label}`}
              >
                {copiedFields.has(item.label) ? (
                  <Check className="h-5 w-5 sm:h-4 sm:w-4 text-green-600" />
                ) : (
                  <Copy className="h-5 w-5 sm:h-4 sm:w-4 text-gray-600" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 p-4 sm:p-4 rounded-lg border border-amber-200">
        <p className="text-sm sm:text-sm text-amber-800 leading-relaxed">
          <span className="font-semibold">Importante:</span> Después de realizar
          el pago, haz clic en &quot;Ya pagué&quot; para continuar con la
          validación.
        </p>
      </div>

      <div className="pt-4 sm:pt-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-3">
          <Button
            variant="outline"
            onClick={onGoBack}
            className="w-full sm:flex-1 h-14 sm:h-12 font-black text-base sm:text-base order-2 sm:order-1"
          >
            Cambiar método
          </Button>
          <Button
            onClick={onPaymentCompleted}
            className="w-full sm:flex-1 h-14 sm:h-12 font-black text-base sm:text-base order-1 sm:order-2"
          >
            Ya pagué
          </Button>
        </div>
      </div>
    </div>
  );
}
