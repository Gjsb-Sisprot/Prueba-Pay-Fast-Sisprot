"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/shared/lib/utils";
import { methods, PaymentMethod } from "@/shared/types/payments-methos";
import { useClientStore } from "@/shared/lib/store/client-store";

interface PaymentMethodsSelectorProps {
  onSelect: (method: PaymentMethod) => void;
}

export function PaymentMethodsSelector({ onSelect }: PaymentMethodsSelectorProps) {
  const { selectedContract } = useClientStore();
  const [selected, setSelected] = useState<PaymentMethod>(methods[0]);

  const bankCode = selectedContract?.bank_associated.bank_code;

  // 🔍 Filtramos los métodos según el bank_code
  const filteredMethods = methods.filter((method) => {
    // No mostrar Débito Inmediato si el banco es 0174
    if (bankCode === "0174" && method.id === "debito-inmediato") {
      return false;
    }

    if (method.name.toLowerCase().includes("qr")) {
      // Solo mostrar Pago QR si el bank_code es '0191'
      return bankCode === "0191";
    }

    return true; // los demás métodos siempre se muestran
  });

  // Detectar si entre los métodos filtrados hay un método QR
  const hasQR = filteredMethods.some((method) => method.name.toLowerCase().includes("qr"));

  // Si el método seleccionado queda fuera de los métodos filtrados (por ejemplo
  // porque se ocultó Débito Inmediato para bank_code '0174'), seleccionamos
  // el primero disponible para evitar estados inconsistentes.
  useEffect(() => {
    if (!filteredMethods.some((m) => m.id === selected.id)) {
      setSelected(filteredMethods[0] ?? methods[0]);
    }
  }, [filteredMethods, selected]);

  useEffect(() => {
    onSelect(selected);
  }, [selected, onSelect]);

  return (
    <>
      {/* Mobile layout: single row grid (5 cols if QR present, else 4) */}
      <div className="block sm:hidden">
        <div className={cn("grid gap-4 mt-6 px-2", hasQR ? "grid-cols-5" : "grid-cols-4")}>
          {filteredMethods.map((method) => (
            <div key={method.id} className="flex flex-col items-center">
              <button
                onClick={() => setSelected(method)}
                className={cn(
                  "flex flex-col items-center justify-center w-15 h-15 rounded-2xl border-2 transition-all duration-200 shadow-sm",
                  selected.id === method.id
                    ? "bg-black border-black text-white"
                    : "bg-gray-500 border-gray-300 text-white hover:bg-gray-200"
                )}
              >
                {method.image && (
                  <Image
                    src={String(method.image)}
                    alt={method.name}
                    width={30}
                    height={30}
                    className="mb-2"
                  />
                )}
              </button>
              <div>
                <span className="text-sm font-medium">{method.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop / sm+ layout: original horizontal selector */}
      <div className="hidden sm:flex sm:justify-around sm:gap-4 mt-6 w-full">
        {filteredMethods.map((method) => (
          <div key={method.id} className="flex flex-col items-center">
            <button
              onClick={() => setSelected(method)}
              className={cn(
                "flex flex-col items-center justify-center w-15 h-15 rounded-2xl border-2 transition-all duration-200 shadow-sm",
                selected.id === method.id
                  ? "bg-black border-black text-white"
                  : "bg-gray-500 border-gray-300 text-white hover:bg-gray-200"
              )}
            >
              {method.image && (
                <Image
                  src={String(method.image)}
                  alt={method.name}
                  width={30}
                  height={30}
                  className="mb-2"
                />
              )}
            </button>
            <div>
              <span className="text-sm font-medium">{method.name}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
