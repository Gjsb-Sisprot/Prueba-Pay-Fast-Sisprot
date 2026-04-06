"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useClientStore } from "@/shared/lib/store/client-store";

interface PaymentAmountStepProps {
  expectedAmount: string;
  dollarAmount?: string;
  paymentMethod?: string;
}

export function PaymentAmountStep({
  expectedAmount,
  dollarAmount,
  paymentMethod,
}: PaymentAmountStepProps) {
  const { transferredAmount, setTransferredAmount, setValidationStep } =
    useClientStore();

  // Estado interno para manejar solo los dígitos (sin formateo)
  const [rawDigits, setRawDigits] = useState("000");
  const [displayValue, setDisplayValue] = useState("0,00");

  // Inicializar con el valor guardado si existe
  useEffect(() => {
    if (transferredAmount) {
      // Convertir el valor guardado a formato de dígitos
      const numericValue = parseFloat(transferredAmount) * 100;
      const digits = Math.round(numericValue).toString().padStart(3, "0");
      setRawDigits(digits);
      setDisplayValue(formatDisplayValue(digits));
    }
  }, [transferredAmount]);

  // Formatear los dígitos para mostrar con separadores de miles y decimales
  const formatDisplayValue = (digits: string): string => {
    // Asegurar que tenemos al menos 3 dígitos
    const paddedDigits = digits.padStart(3, "0");

    // Separar centavos (últimos 2 dígitos) del resto
    const cents = paddedDigits.slice(-2);
    const wholePart = paddedDigits.slice(0, -2) || "0";

    // Formatear la parte entera con separadores de miles
    const formattedWhole = parseInt(wholePart, 10)
      .toLocaleString("es-VE", {
        useGrouping: true,
      })
      .replace(/,/g, ".");

    return `${formattedWhole},${cents}`;
  };

  // Convertir dígitos a valor numérico para validaciones
  const getNumericValue = (digits: string): number => {
    const paddedDigits = digits.padStart(3, "0");
    return parseInt(paddedDigits, 10) / 100;
  };

  // Manejar entrada de teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();

    if (e.key >= "0" && e.key <= "9") {
      // Agregar dígito desde la derecha
      const newDigits = (rawDigits + e.key).slice(-15); // Limitar a 15 dígitos máximo
      setRawDigits(newDigits);
      setDisplayValue(formatDisplayValue(newDigits));
    } else if (e.key === "Backspace") {
      // Remover último dígito
      const newDigits = rawDigits.length > 1 ? rawDigits.slice(0, -1) : "0";
      setRawDigits(newDigits);
      setDisplayValue(formatDisplayValue(newDigits));
    }
  };

  // Manejar cambios en el input (para dispositivos móviles)
  const handleInputChange = (value: string) => {
    // Extraer solo los dígitos del valor ingresado
    const digitsOnly = value.replace(/\D/g, "");

    if (digitsOnly.length <= 15) {
      // Limitar a 15 dígitos máximo
      setRawDigits(digitsOnly || "0");
      setDisplayValue(formatDisplayValue(digitsOnly || "0"));
    }
  };

  const handleConfirm = () => {
    // Convertir a formato decimal para guardar
    const numericValue = getNumericValue(rawDigits);
    setTransferredAmount(numericValue.toFixed(2));

    // Ir al paso de confirmación
    setValidationStep("confirmation");
  };

  // Limpiar el monto (reset a 0,00)
  const handleClear = () => {
    setRawDigits("000");
    setDisplayValue("0,00");
  };

  // Determinar el paso anterior según el método de pago
  const previousStep = paymentMethod === "zelle" ? "date" : "date";

  // Validar si se puede confirmar
  const numericValue = getNumericValue(rawDigits);
  const canConfirm = numericValue > 0;

  // Configurar según método de pago
  const isZelle = paymentMethod === "zelle";
  const currencySymbol = isZelle ? "$" : "Bs";
  const currencyName = isZelle ? "dólares" : "bolívares";
  const expectedDisplayAmount = isZelle ? dollarAmount : expectedAmount;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-center px-2">
        <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-3 leading-tight">
          Confirma el monto en {currencyName}
        </h3>
        <p className="text-sm text-gray-600">
          Escribe los dígitos del monto transferido
        </p>
      </div>

      <div className="space-y-4 flex flex-col items-center py-4 sm:py-6 px-2">
        <div className="text-center w-full max-w-sm sm:max-w-md">
          <div className="relative bg-gray-50 rounded-2xl p-4 sm:p-6 border-2 border-gray-100 min-h-[90px] flex items-center justify-center">
            <div className="absolute left-4 sm:left-6 top-1/2 transform -translate-y-1/2 text-xl sm:text-2xl font-black text-gray-600">
              {currencySymbol}
            </div>
            <Input
              type="text"
              placeholder="0,00"
              value={displayValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-center text-3xl sm:text-4xl font-black h-16 sm:h-18 border-none shadow-none focus-visible:ring-0 focus-visible:border-none focus-visible:shadow-none outline-none bg-transparent pl-12 sm:pl-16 pr-4 text-gray-900 placeholder:text-gray-400"
              inputMode="numeric"
              autoFocus
            />
          </div>

          {/* Botón para limpiar */}
          <div className="mt-3 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              Limpiar
            </Button>
          </div>

          <div className="mt-4 p-3 sm:p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-800 font-medium mb-1">
              Monto esperado:
            </p>
            <p className="text-lg sm:text-xl font-black text-blue-900">
              {currencySymbol}{" "}
              {parseFloat(
                expectedDisplayAmount || expectedAmount
              ).toLocaleString(isZelle ? "en-US" : "es-VE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-3 px-2">
        <Button
          variant="outline"
          onClick={() => setValidationStep(previousStep)}
          className="flex-1 h-12 font-black text-sm rounded-xl"
        >
          Paso anterior
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="flex-1 h-12 font-black text-sm rounded-xl disabled:opacity-50"
        >
          Confirmar monto
        </Button>
      </div>
    </div>
  );
}
