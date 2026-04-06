"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { format, isAfter } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/shared/lib/utils";
import type { FormFieldsProps, MissingField } from "./types";

export function FormFields({
  form,
  date,
  bankSearch,
  openPop,
  openBankDropdown,
  selectedBank,
  filteredBanks,
  missingFields,
  onDateChange,
  onBankSearchChange,
  onBankSelect,
  onOpenPopChange,
  onOpenBankDropdownChange,
}: FormFieldsProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  // Helper para verificar si un campo está en missingFields
  const isFieldMissing = (field: MissingField) => missingFields.includes(field);

  const handleBankInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBankSearchChange(e.target.value);
    onOpenBankDropdownChange(true);
    setValue("selectedBank", null, { shouldValidate: true });
  };

  return (
    <div className="space-y-3">
      {/* Fecha */}
      <div className="flex flex-col">
        <label
          className={cn(
            "block text-sm font-medium mb-1",
            isFieldMissing("date") && !date ? "text-red-600" : "text-gray-700"
          )}
        >
          Fecha del pago (momento en que realizó el pago)
          {isFieldMissing("date") && !date && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
        <Popover open={openPop} onOpenChange={onOpenPopChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground",
                isFieldMissing("date") && !date && "border-red-300 bg-red-50"
              )}
            >
              <CalendarIcon
                className={cn(
                  "mr-2 h-4 w-4",
                  isFieldMissing("date") && !date && "text-red-400"
                )}
              />
              {date
                ? format(date, "dd/MM/yyyy", { locale: es })
                : "Seleccionar fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={onDateChange}
              initialFocus
              locale={es}
              disabled={(day: Date) => isAfter(day, new Date())}
            />
          </PopoverContent>
        </Popover>
        {isFieldMissing("date") && !date && !errors.date && (
          <p className="text-amber-600 text-xs mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            No se encontró la fecha en el comprobante
          </p>
        )}
        {errors.date && (
          <p className="text-red-600 text-sm mt-1">{errors.date.message}</p>
        )}
      </div>

      {/* Banco Emisor */}
      <div className="relative">
        <label
          className={cn(
            "block text-sm font-medium mb-1",
            isFieldMissing("bankCode") && !selectedBank ? "text-red-600" : "text-gray-700"
          )}
        >
          Banco Emisor
          {isFieldMissing("bankCode") && !selectedBank && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
        <div className="relative">
          <Input
            type="text"
            placeholder="Selecciona o busca un banco..."
            value={bankSearch}
            onChange={handleBankInputChange}
            onClick={() => onOpenBankDropdownChange(!openBankDropdown)}
            className={cn(
              "pr-8 cursor-pointer text-[16px]",
              isFieldMissing("bankCode") &&
                !selectedBank &&
                "border-red-300 bg-red-50"
            )}
          />
        </div>

        {openBankDropdown && (
          <ul className="absolute z-10 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded mt-1 shadow">
            {filteredBanks.length > 0 ? (
              filteredBanks.map((bank) => (
                <li
                  key={bank.code}
                  className={cn(
                    "p-2 cursor-pointer hover:bg-gray-100",
                    selectedBank?.code === bank.code &&
                      "bg-gray-200 font-semibold"
                  )}
                  onClick={() => onBankSelect(bank)}
                >
                  {bank.code} - {bank.name}
                </li>
              ))
            ) : (
              <li className="p-2 text-gray-500">No se encontraron bancos</li>
            )}
          </ul>
        )}

        {isFieldMissing("bankCode") && !selectedBank && !errors.selectedBank && (
          <p className="text-amber-600 text-xs mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            No se identificó el banco emisor en el comprobante
          </p>
        )}
        {errors.selectedBank && (
          <p className="text-red-600 text-sm mt-1">
            {errors.selectedBank.message as string}
          </p>
        )}
      </div>

      {/* Monto */}
      <div>
        <label
          className={cn(
            "block text-sm font-medium mb-1",
            isFieldMissing("amount") && !watch("transferredAmount") ? "text-red-600" : "text-gray-700"
          )}
        >
          Monto transferido
          {isFieldMissing("amount") && !watch("transferredAmount") && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
        <Input
          type="text"
          placeholder="Ej: 100.00"
          {...register("transferredAmount")}
          onInput={(e: React.FormEvent<HTMLInputElement>) => {
            e.currentTarget.value = e.currentTarget.value.replace(
              /[^0-9.,]/g,
              ""
            );
          }}
          className={cn(
            "text-[16px]",
            isFieldMissing("amount") &&
              !watch("transferredAmount") &&
              "border-red-300 bg-red-50"
          )}
          maxLength={20}
        />
        {isFieldMissing("amount") &&
          !watch("transferredAmount") &&
          !errors.transferredAmount && (
            <p className="text-amber-600 text-xs mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              No se encontró el monto en el comprobante
            </p>
          )}
        {errors.transferredAmount && (
          <p className="text-red-600 text-sm">
            {errors.transferredAmount.message}
          </p>
        )}
      </div>

      {/* Referencia */}
      <div>
        <label
          className={cn(
            "block text-sm font-medium mb-1",
            isFieldMissing("referenceNumber") && !watch("referenceNumber") ? "text-red-600" : "text-gray-700"
          )}
        >
          Número de referencia
          {isFieldMissing("referenceNumber") && !watch("referenceNumber") && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
        <Input
          type="text"
          placeholder="Número de referencia"
          {...register("referenceNumber")}
          onInput={(e: React.FormEvent<HTMLInputElement>) => {
            e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
          }}
          className={cn(
            "text-[16px]",
            isFieldMissing("referenceNumber") &&
              !watch("referenceNumber") &&
              "border-red-300 bg-red-50"
          )}
          maxLength={12}
        />
        {isFieldMissing("referenceNumber") &&
          !watch("referenceNumber") &&
          !errors.referenceNumber && (
            <p className="text-amber-600 text-xs mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              No se encontró la referencia en el comprobante
            </p>
          )}
        {errors.referenceNumber && (
          <p className="text-red-600 text-sm">{errors.referenceNumber.message}</p>
        )}
      </div>
    </div>
  );
}
