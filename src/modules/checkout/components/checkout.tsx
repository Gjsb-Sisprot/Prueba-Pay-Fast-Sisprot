"use client";

import { useState } from "react";
import { PaymentMethodsSelector } from "@/modules/checkout/components/payment-methods/payment-methods";
import { PaymentMethod } from "@/shared/types/payments-methos";
import { PaymentValidate } from "@/modules/checkout/components/payment-validate";
import { Contract } from "@/shared/lib/api-client";
import { useClientStore } from "@/shared/lib/store/client-store";

interface CheckoutProps {
  amount: string;
  dollarAmount?: string; // Monto en dólares del API
  invoiceConcept: {
    serviceName: string;
    details: string;
  };
   selectedContract: Contract | null;
}

export function Checkout({  amount,  invoiceConcept,dollarAmount, selectedContract }: CheckoutProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>({ id: "", name: "", description: "" });
  const {selectedInvoice} = useClientStore();

  console.log("Selected Contract in Checkout:", selectedInvoice);

  const renderMethodComponent = () => {
    // switch (selectedMethod.id) {
    //   case "pago-qr":
    //     return <p className="text-center font-medium text-gray-700">Formulario del QR</p>;

    //   default:
          return <PaymentValidate paymentMethod={selectedMethod.id} amount={amount} dollarAmount={dollarAmount} selectedContract={selectedContract} />
    // }
  };

  return (
    <div className="space-y-6">
      {/* Información del concepto */}
      <div className="text-center">
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm">
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

      {/* Selector de método */}
      <PaymentMethodsSelector
        onSelect={(method) => {
          setSelectedMethod(method);
        }}
      />

      {/* Componente dinámico debajo de los botones */}
      <div className="mt-6">{renderMethodComponent()}</div>
    </div>
  );
}
