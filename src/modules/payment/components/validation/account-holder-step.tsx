"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useClientStore } from "@/shared/lib/store/client-store";
import { User } from "lucide-react";

export function PaymentAccountHolderStep() {
  const { accountHolder, setAccountHolder, setValidationStep } =
    useClientStore();
  const [localAccountHolder, setLocalAccountHolder] = useState(accountHolder);

  const handleConfirm = () => {
    if (localAccountHolder.trim()) {
      setAccountHolder(localAccountHolder.trim());
      setValidationStep("date");
    }
  };

  const canConfirm = localAccountHolder.trim().length > 0;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-center px-2">
        <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-3 leading-tight">
          ¿Quién es el titular de la cuenta?
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Indica el nombre completo del titular de la cuenta Zelle desde la cual
          realizaste el pago
        </p>
      </div>

      <div className="space-y-4 px-2">
        <div className="relative">
          <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Nombre completo del titular"
            value={localAccountHolder}
            onChange={(e) => setLocalAccountHolder(e.target.value)}
            className="pl-12 h-14 sm:h-12 text-base rounded-xl placeholder:text-gray-400"
            maxLength={100}
          />
        </div>

        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
          <p className="text-sm text-blue-800 font-medium mb-1">
            💡 Información importante:
          </p>
          <p className="text-sm text-blue-700">
            Asegúrate de escribir el nombre exactamente como aparece en tu
            cuenta Zelle para evitar retrasos en la validación.
          </p>
        </div>
      </div>

      <div className="flex gap-3 pt-3 px-2">
        <Button
          variant="outline"
          onClick={() => setValidationStep("reference")}
          className="flex-1 h-12 font-black text-sm rounded-xl"
        >
          Paso anterior
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="flex-1 h-12 font-black text-sm rounded-xl disabled:opacity-50"
        >
          Confirmar titular
        </Button>
      </div>
    </div>
  );
}
