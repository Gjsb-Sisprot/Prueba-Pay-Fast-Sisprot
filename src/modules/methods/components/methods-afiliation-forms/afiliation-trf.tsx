"use client";

import { UseFormReturn } from "react-hook-form";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SelectNative } from "@/shared/components/ui/select-native";
import { useEffect, useState } from "react";
import { TransferenciaValues } from "@/shared/lib/validation/afiliation";
import { ChevronUp, ChevronDown } from "lucide-react";
import { AffiliationInfo } from "./afiliation-info";
import { type Bank } from "@/shared/types/banks-data";
import { useBanks } from "@/shared/hooks/use-banks";

interface PaymentFormTransferenciaProps {
  form: UseFormReturn<TransferenciaValues>;
  method?: string;

}

export function AfiliationFormTransferencia({ form }: PaymentFormTransferenciaProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const account = watch("account", "");
  const [search, setSearch] = useState("");
  const selectedBank = watch("selectedBank");
  const [open, setOpen] = useState(false);

  // reflect prefilled selectedBank in the search input when editing
  useEffect(() => {
    if (selectedBank && selectedBank.code && selectedBank.name) {
      setSearch(`${selectedBank.code} - ${selectedBank.name}`);
    } else if (!selectedBank) {
      setSearch("");
    }
  }, [selectedBank]);



  // Formateo automático con guiones cada 4 dígitos
  useEffect(() => {
    const digits = account.replace(/-/g, "");
    if (digits.length > 0) {
      const formatted = digits.match(/.{1,4}/g)?.join("-") ?? "";
      if (formatted !== account) setValue("account", formatted);
    }
  }, [account, setValue]);

  const { banks: apiBanks, loading: banksLoading, error: banksError } = useBanks();

  // Use only API-provided banks
  const sourceBanks: Bank[] = apiBanks ?? [];

  const filteredBanks = sourceBanks.filter(
    (bank) =>
      bank.name.toLowerCase().includes(search.toLowerCase()) ||
      bank.code.includes(search)
  );

  const handleSelect = (bank: Bank) => {
    setValue("selectedBank", bank, { shouldValidate: true });
    setSearch(`${bank.code} - ${bank.name}`);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <AffiliationInfo />
      {/* Banco emisor (selector similar a PagoMovil) */}
      {/* Document type & number */}
      <div className="flex gap-3 mt-2">
        <div className="sm:w-40">
          <Label htmlFor="documentType">Tipo de documento</Label>
          <SelectNative id="documentType" {...register("documentType")} defaultValue="">
            <option value="">Seleccionar</option>
            <option value="V">V</option>
            <option value="E">E</option>
            <option value="J">J</option>
            <option value="G">G</option>
            <option value="P">P</option>
          </SelectNative>
          {errors.documentType && (
            <p className="text-sm text-red-500 mt-1">{String(errors.documentType.message)}</p>
          )}
        </div>

        <div className="flex-1">
          <Label htmlFor="documentNumber">Número de documento</Label>
          <Input
            id="documentNumber"
            placeholder="Número de documento"
            maxLength={9}
            {...register("documentNumber")}
            onInput={(e: React.FormEvent<HTMLInputElement>) => {
              e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "").slice(0, 9);
            }}
            className="text-[16px]"
          />
          {errors.documentNumber && (
            <p className="text-sm text-red-500 mt-1">{String(errors.documentNumber.message)}</p>
          )}
        </div>
      </div>
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">Banco Emisor</label>
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
              <li className="p-2 text-[16px] text-gray-500">No se encontraron bancos</li>
            )}
          </ul>
        )}

        {errors.selectedBank && (
          <p className="text-red-600 text-sm mt-1">{errors.selectedBank.message as string}</p>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <Label>Número de cuenta</Label>
          <Input placeholder="0000-0000-0000-0000-0000" maxLength={24} {...register("account")}
            onInput={(e: React.FormEvent<HTMLInputElement>) => {
              e.currentTarget.value = e.currentTarget.value.replace(/[^0-9-]/g, "");
            }}
            className="text-[16px]"

          />
          {errors.account && (
            <p className="text-sm text-red-500">{String(errors.account.message)}</p>
          )}
        </div>

        {/* Alias */}
        <div>
          <Label htmlFor="name">Alias</Label>
          <Input
            id="name"
            placeholder="Alias del método"
            maxLength={30}
            autoComplete="off"
            {...register("name")}
            className="text-[16px]"
          />
          {errors.name && (
            <p className="text-sm text-red-500 mt-1">
              {String(errors.name.message)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
