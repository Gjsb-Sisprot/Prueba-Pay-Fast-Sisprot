"use client";

import type { Bank } from "@/shared/types/banks-data";
import { useBanks } from "@/shared/hooks/use-banks";
import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/shared/components/ui/input";
import { ChevronDown, ChevronUp, CalendarIcon, AlertTriangle } from "lucide-react";
import { PaymentNationalFormValues } from "@/shared/lib/validation/payments-national-schema";
import { Button } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/shared/lib/utils";
import { PaymentReceipt } from "../../payment-receipt";

interface PaymentNationalFormProps {
  form: UseFormReturn<PaymentNationalFormValues>;
  amount?: string;
}

export function PaymentNationalForm({ form, amount }: PaymentNationalFormProps) {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = form;

  const [search, setSearch] = useState("");
  const selectedBank = watch("selectedBank");
  const [open, setOpen] = useState(false);
  const [openPop, setOpenPop] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [displayAmount, setDisplayAmount] = useState("");

  // 🔹 Limpiar campos al montar el componente
  useEffect(() => {
    reset({
      date: "",
      selectedBank: null,
      transferredAmount: "",
      referenceNumber: "",
    });
    setSearch("");
    setDate(undefined);
    setDisplayAmount("");
  }, [reset]);

  // 🔹 Actualiza el valor del campo `date` cuando cambia la fecha
  const handleDateChange = (selectedDate?: Date) => {
    setDate(selectedDate);
    if (selectedDate) {
      setValue("date", selectedDate.toISOString().split("T")[0], { shouldValidate: true });
    }
    setOpenPop(false);
  };

  const { banks: apiBanks, loading: banksLoading, error: banksError } = useBanks();

  // Use API-provided banks; while loading, sourceBanks is empty
  const sourceBanks: Bank[] = apiBanks ?? [];

  const filteredBanks = sourceBanks.filter(
    (bank) =>
      bank.name.toLowerCase().includes(search.toLowerCase()) ||
      bank.code.includes(search)
  );

  const handleSelect = (bank: { code: string; name: string }) => {
    setValue("selectedBank", bank, { shouldValidate: true });
    setSearch(`${bank.code} - ${bank.name}`);
    setOpen(false);
  };

  // Normaliza el valor de transferredAmount: cambia comas por puntos y
  // elimina puntos extras (solo se conserva el primero como separador decimal).
  const normalizeTransferredAmount = (value: string | undefined) => {
    if (!value) return value ?? "";
    // reemplazar todas las comas por puntos
    let normalized = value.replace(/,/g, ".");
    // si hay más de un punto, conservar solo el primero
    const firstDotIndex = normalized.indexOf(".");
    if (firstDotIndex !== -1) {
      normalized =
        normalized.slice(0, firstDotIndex + 1) +
        normalized.slice(firstDotIndex + 1).replace(/\./g, "");
    }
    return normalized;
  };

  const formatVisualAmount = (value: string) => {
    if (!value) return "";
    
    // Separar por la primera coma (nuestro separador decimal visual)
    const parts = value.split(",");
    
    // La parte entera es todo lo anterior a la primera coma.
    // Quitamos cualquier carácter no numérico (incluyendo los puntos de miles que nosotros mismos pusimos)
    const integerPart = parts[0].replace(/\D/g, "");
    
    // La parte decimal es lo que viene después de la coma (máximo 2 dígitos)
    const decimalPart = parts.length > 1 ? parts[1].replace(/\D/g, "").slice(0, 2) : undefined;

    if (integerPart === "" && decimalPart === undefined && !value.includes(",")) return "";
    
    // Formatear parte entera con puntos de miles usando regex
    let formattedInteger = integerPart;
    if (integerPart !== "") {
      // Eliminar ceros a la izquierda a menos que sea solo "0"
      if (integerPart.length > 1) {
        formattedInteger = integerPart.replace(/^0+/, "") || "0";
      }
      formattedInteger = formattedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    } else if (decimalPart !== undefined || value.includes(",")) {
      // Si empieza con separador, asumimos 0
      formattedInteger = "0";
    }

    if (decimalPart !== undefined) {
      return `${formattedInteger},${decimalPart}`;
    }
    
    // Si el valor termina en coma, mantenerla para permitir seguir escribiendo decimales
    if (value.includes(",")) {
      return `${formattedInteger},`;
    }
    
    return formattedInteger;
  };

  const unformatVisualAmount = (value: string) => {
    // Quitar puntos de miles y convertir coma decimal en punto
    return value.replace(/\./g, "").replace(/,/g, ".");
  };

  // Comparación entre el monto ingresado y el `amount` (prop) para mostrar alerta
  const watchedTransferred = watch("transferredAmount");
  const parsedTransferred = parseFloat(normalizeTransferredAmount(watchedTransferred) || "0");
  const parsedAmount = amount ? parseFloat(normalizeTransferredAmount(amount) || "0") : undefined;
  const isIncompletePayment =
    typeof parsedAmount === "number" && !isNaN(parsedAmount) && parsedTransferred > 0 && parsedTransferred < parsedAmount;

  // Formateador de Bs. para mostrar montos en la UI
  const formatBs = (value: number) =>
    `Bs. ${value.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const remainingAmount = isIncompletePayment && typeof parsedAmount === "number"
    ? Math.max(0, parsedAmount - parsedTransferred)
    : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fecha en la que realizaste el pago
        </label>

        <Popover open={openPop} onOpenChange={setOpenPop}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateChange}
              initialFocus
              locale={es}
              disabled={{ after: new Date() }} // no permitir fechas posteriores a hoy
            />
          </PopoverContent>
        </Popover>

        {errors.date && (
          <p className="text-red-600 text-sm mt-1">{errors.date.message}</p>
        )}
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Banco Emisor
        </label>
        <div className="relative">
          <Input
            type="text"
            placeholder="Selecciona o busca un banco..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
              setValue("selectedBank", null, { shouldValidate: true });
            }}
            onClick={() => setOpen(!open)}
            className="pr-8 cursor-pointer text-[16px]"
          />
          <div
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
            onClick={() => setOpen(!open)}
          >
            {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>

        {open && (
          <ul className="absolute z-10 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded mt-1 shadow">
            {banksLoading ? (
              <li className="p-2 text-[16px] text-gray-500">Cargando bancos...</li>
            ) : banksError ? (
              <li className="p-2 text-[16px] text-red-600">Error cargando bancos</li>
            ) : filteredBanks.length > 0 ? (
              filteredBanks.map((bank) => (
                <li
                  key={bank.code}
                  className={`p-2 cursor-pointer hover:bg-gray-100 ${selectedBank?.code === bank.code
                    ? "bg-gray-200 font-semibold"
                    : ""
                    }`}
                  onClick={() => handleSelect(bank)}
                >
                  {bank.code} - {bank.name}
                </li>
              ))
            ) : (
              <li className="p-2 text-[16px] text-gray-500">
                No se encontraron bancos
              </li>
            )}
          </ul>
        )}

        {errors.selectedBank && (
          <p className="text-red-600 text-sm mt-1">
            {errors.selectedBank.message as string}
          </p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Monto transferido
        </label>
        <Input
          type="text"
          placeholder="Monto Ej: 10.110,10"
          className="text-[16px]"
          value={displayAmount}
          onChange={(e) => {
            let rawValue = e.target.value;
            
            // Si el usuario escribe un punto, y no hay comas todavía, lo tratamos como decimal (coma)
            // Esto permite que '10.5' se convierta en '10,' -> '10,5'
            if (rawValue.endsWith('.') && !displayAmount.includes(',')) {
              rawValue = rawValue.slice(0, -1) + ',';
            }

            const formatted = formatVisualAmount(rawValue);
            setDisplayAmount(formatted);
            setValue("transferredAmount", unformatVisualAmount(formatted), {
              shouldValidate: true,
              shouldDirty: true,
            });
          }}
          maxLength={20}
        />
        {errors.transferredAmount && (
          <p className="text-red-600 text-sm">
            {errors.transferredAmount.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Número de referencia
        </label>
        <Input
          type="text"
          {...register("referenceNumber")}
          placeholder="Número de referencia"
          onInput={(e: React.FormEvent<HTMLInputElement>) => {
            e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
          }}
          className="text-[16px]"
          maxLength={12}

        />
        {errors.referenceNumber && (
          <p className="text-red-600 text-sm">
            {errors.referenceNumber.message}
          </p>
        )}
      </div>
      {isIncompletePayment && (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm text-center">
          <div className="flex flex-col items-center justify-center gap-2 mb-2">
            <AlertTriangle className="h-12 w-12 text-yellow-600 flex-shrink-0" />
            <div className="font-semibold text-base">Pago incompleto</div>
          </div>
          <p className="mt-1">
            Estás por realizar un pago incompleto: este pago se abonará a su factura; sin embargo,
            al pagar la diferencia restante se calculará a la tasa del BCV del día. Se recomienda
            pagar la diferencia el día de hoy para evitar recalculos por el monto restante.
          </p>
          <p className="mt-2 text-lg font-black">Falta pagar: {formatBs(remainingAmount)}</p>
        </div>
      )}
      <PaymentReceipt />
    </div>
  );
}
