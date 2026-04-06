"use client";

import React from "react";
import { Info, Smartphone, CreditCard, UserCheck, UserX } from "lucide-react";

export type PaymentDataShape = {
  sender?: string | null;
  sender_affiliated?: boolean;
  method?: number;
  method_name?: string;
  [k: string]: unknown;
};

interface Props {
  paymentData: PaymentDataShape | null;
  apiMessage?: string | null;
}

export function AffiliationPaymentDetails({ paymentData, apiMessage }: Props) {

  if (!paymentData) return null;

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600">Información del pago detectado:</div>

      {/* API message */}
      {apiMessage && (
        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded">
          <Info className="w-5 h-5 text-blue-600 mt-1" />
          <div className="text-sm text-blue-800">{apiMessage}</div>
        </div>
      )}

      {/* Key info cards */}
      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-center gap-3 p-3 bg-white border rounded shadow-sm">
          <CreditCard className="w-6 h-6 text-gray-700" />
          <div>
            <div className="text-xs text-gray-500">Método</div>
            <div className="text-sm font-medium text-gray-900">{paymentData.method_name ?? paymentData.method}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-white border rounded shadow-sm">
          <Smartphone className="w-6 h-6 text-gray-700" />
          <div>
            <div className="text-xs text-gray-500">Remitente</div>
            <div className="text-sm font-medium text-gray-900">{paymentData.sender ?? "-"}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-white border rounded shadow-sm">
          {paymentData.sender_affiliated ? (
            <UserCheck className="w-6 h-6 text-green-600" />
          ) : (
            <UserX className="w-6 h-6 text-red-600" />
          )}
          <div>
            <div className="text-xs text-gray-500">Afiliado previamente</div>
            <div className="text-sm font-medium text-gray-900">{paymentData.sender_affiliated ? "Sí" : "No"}</div>
          </div>
        </div>
      </div>

  
    </div>
  );
}

export default AffiliationPaymentDetails;
