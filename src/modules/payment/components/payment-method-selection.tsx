"use client";

import { Button } from "@/shared/components/ui/button";
import { PaymentMethod } from "@/shared/lib/store/client-store";
import { ChevronRight } from "lucide-react";

const paymentMethods: PaymentMethod[] = [
  {
    id: "pago-movil",
    name: "Pago Móvil",
    description: "Transferencia desde tu app bancaria",
  },
  {
    id: "transferencia",
    name: "Transferencia",
    description: "Transferencia bancaria tradicional",
  },
  {
    id: "zelle",
    name: "Zelle",
    description: "Pago en dólares americanos",
  },
];

interface PaymentMethodSelectionProps {
  onSelectMethod: (method: PaymentMethod) => void;
  amount: string;
  dollarAmount?: string; // Monto en dólares del API
  invoiceConcept: {
    serviceName: string;
    details: string;
  };
}

export function PaymentMethodSelection({
  onSelectMethod,
  amount,
  dollarAmount,
  invoiceConcept,
}: PaymentMethodSelectionProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-2">
          Confirma tu pago
        </h3>
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Concepto</span>
              <span className="text-right text-sm font-black">
                {invoiceConcept.serviceName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Detalle</span>
              <span className="text-right text-sm font-medium">
                {invoiceConcept.details}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Monto</span>
              <span className="text-right text-sm font-black">Bs {amount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-base font-black text-gray-900">
          ¿Cómo vas a pagar?
        </h4>
        <p className="text-sm text-gray-600">
          Si no ves alguno de los métodos de pago usuales, es porque{" "}
          <span className="font-bold">Sisprot Global Fiber</span> no lo tiene
          disponible ahora.
        </p>

        <div className="space-y-2">
          {paymentMethods.map((method) => {
            // Calcular el monto según el método de pago
            const getMethodAmount = (methodId: string) => {
              if (methodId === "zelle") {
                // Usar el monto en dólares del API si está disponible
                if (dollarAmount) {
                  return `$${parseFloat(dollarAmount).toFixed(2)}`;
                }
                // Fallback a cálculo si no hay dollarAmount
                const bolivarAmount = parseFloat(amount.replace(/,/g, ""));
                const calculatedDollarAmount = (bolivarAmount / 37).toFixed(2);
                return `$${calculatedDollarAmount}`;
              }
              return `Bs ${amount}`;
            };

            return (
              <Button
                key={method.id}
                variant="outline"
                className="w-full h-auto p-4 flex justify-between items-center text-left"
                onClick={() => onSelectMethod(method)}
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{method.name}</div>
                  <div className="text-sm text-gray-500">
                    {method.description}
                  </div>
                  <div className="text-lg font-black text-600 mt-1">
                    {getMethodAmount(method.id)}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
