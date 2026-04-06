"use client";

import { Button } from "@/shared/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Contract } from "@/shared/lib/api-client";
import { PaymentConfirmModal } from "./payment-confirm-modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { debitoInmediatoSchema } from "@/shared/lib/validation/debito-inmediato-schema";
import { DebitoInmediatoForm, DebitoInmediatoFormValues } from "./payment-methods/forms/validate-debito-inmediato";
import { usePayments } from "@/modules/payment/hooks/use-payments";
import { useCopyToClipboard } from "@/shared/hooks/use-copy-to-clipboard"; // ✅ nuevo hook
import { getMethodTitle } from "@/shared/hooks/methods";
import { QRPaymentComponent } from "./payment-qr-component";
import { useClientStore } from "@/shared/lib/store/client-store";

interface PaymentData {
  label: string;
  value: string;
}

interface PaymentValidateProps {
  paymentMethod: string;
  amount: string;
  dollarAmount?: string;
  selectedContract: Contract | null;
}

const ZELLE_DATA = {
  titular: "Sisprot Global Fiber LLC",
  email: "sisprotgf22@gmail.com",
  bank: "Bank Of America",
};

const getPaymentData = (
  method: string,
  amount: string,
  dollarAmount: string | undefined,
  contract: Contract | null
): PaymentData[] => {
  if (!contract || !contract.bank_associated) {
    return [
      { label: "Error", value: "No se encontraron datos bancarios del contrato" },
    ];
  }

  const { bank_associated } = contract;

  switch (method) {
    case "pago-movil":
      return [
        { label: "Teléfono", value: bank_associated.rlf },
        { label: "Cédula", value: bank_associated.identification },
        { label: "Banco", value: `${bank_associated.bank_code} - ${bank_associated.bank_name}` },
        { label: "Nombre", value: `SISPROT GLOBAL FIBER C.A.` },
        { label: "Monto Bs", value: `${amount}` },

      ];

    case "zelle":
      const zelleAmount = dollarAmount
        ? `$${parseFloat(dollarAmount).toFixed(2)}`
        : `$${(parseFloat(amount.replace(/,/g, "")) / 37).toFixed(2)}`;
      return [
        { label: "Email", value: ZELLE_DATA.email },
        { label: "Titular", value: ZELLE_DATA.titular },
        { label: "Banco", value: ZELLE_DATA.bank },
        { label: "Monto USD", value: zelleAmount },

      ];

    case "debito-inmediato":
      // Para débito inmediato no mostramos datos, va directo al formulario
      return [];

    default:
      return [
        { label: "Cuenta", value: bank_associated.nro_cta },
        { label: "RIF", value: bank_associated.identification },
        { label: "Tipo", value: "Corriente" },
        { label: "Banco", value: bank_associated.bank_name },
        { label: "Nombre", value: `SISPROT GLOBAL FIBER C.A.` },
        { label: "Monto Bs", value: `${amount}` },


      ];
  }
};

export function PaymentValidate({
  paymentMethod,
  amount,
  dollarAmount,
  selectedContract,
}: PaymentValidateProps) {
  const paymentData = getPaymentData(paymentMethod, amount, dollarAmount, selectedContract);
  const [showModal, setShowModal] = useState(false);
  const { sendPaymentConfirmation } = usePayments();
  const { copiedFields, allCopied, copyField, copyAll } = useCopyToClipboard(); // ✅ usar el hook
  const { selectedInvoice } = useClientStore();
  // Hook form para Débito Inmediato: debe declararse siempre para respetar las reglas de hooks
  const formDebitoInmediato = useForm<DebitoInmediatoFormValues>({
    resolver: zodResolver(debitoInmediatoSchema),
    defaultValues: {
      selectedBank: null,
      holderName: "",
      idNumber: "",
      contactMethod: "telefono",
      phonePrefix: "",
      phoneNumber: "",
      accountNumber: "",
      otpCode: "",
    },
  });

  // Si es débito inmediato, mostrar UI simplificada
  if (paymentMethod === "debito-inmediato") {
    return (
      <div className="space-y-4 sm:space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1 text-base leading-relaxed">
                Paga de forma rápida y segura con Débito Inmediato
              </h4>
              <p className="text-sm text-blue-800">Ingresa los datos de tu cuenta bancaria para procesar el pago.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              Monto a pagar: <span className="text-blue-600">Bs {amount}</span>
            </div>
          </div>

          {/* Formulario de Débito Inmediato inline con botón "Solicitar Código" */}
          <DebitoInmediatoForm form={formDebitoInmediato} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
            1
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-1 text-base leading-relaxed">
              Copia los datos y asegúrate de pagar correctamente en tu banco.
            </h4>
            <p className="text-sm text-blue-800">Las agencias tienen datos bancarios únicos.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900">
          {getMethodTitle(paymentMethod)} a esta cuenta
        </h4>
        {paymentMethod === "pago-qr" ? (null) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              copyAll(
                paymentData.map((p) => `${p.label}: ${p.value}`)
              )
            }
          >

            {allCopied ? (
              <>
                <Check className="w-4 h-4 mr-1 text-green-600" /> Copiado
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1 text-gray-600" /> Copiar todo
              </>
            )}
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        {/* 👇 Condición para mostrar QR o datos */}
        {paymentMethod === "pago-qr" ? (
          <QRPaymentComponent invoice={selectedInvoice} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {paymentData.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500 font-medium">{item.label}</span>
                  <span className="text-base font-semibold text-gray-900 break-all">
                    {item.value}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 ml-3"
                  onClick={() => copyField(item.value, item.label)}
                >
                  {copiedFields.has(item.label) ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5 text-gray-600" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 sm:pt-4 space-y-3">
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800 leading-relaxed">
              <span className="font-semibold">Importante:</span> Después de realizar
              el pago, haz clic en &quot;Ya pagué&quot; para continuar con la
              validación.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setShowModal(true)}
              className="w-full sm:flex-1 h-14 font-black text-base"
            >
              Ya pagué
            </Button>
          </div>
        </div>

        <PaymentConfirmModal
          open={showModal}
          onClose={() => setShowModal(false)}
          amount={amount}
          dollarAmount={dollarAmount}
          selectedContract={selectedContract}
          method={{
            id: paymentMethod,
            name: getMethodTitle(paymentMethod),
            description: "",
          }}
          onSubmit={(data) => sendPaymentConfirmation(data, paymentMethod)}
        />
      </div>
    </div>
  );
}
