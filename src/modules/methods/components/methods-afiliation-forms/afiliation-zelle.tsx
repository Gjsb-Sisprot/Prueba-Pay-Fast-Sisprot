"use client";

import { UseFormReturn } from "react-hook-form";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { ZelleValues } from "@/shared/lib/validation/afiliation";
import { AffiliationInfo } from "./afiliation-info";

interface PaymentFormZelleProps {
  form: UseFormReturn<ZelleValues>;
  method?: string;
}

export function AfiliationFormZelle({ form }: PaymentFormZelleProps) {
  const {
    register,
    formState: { errors },
  } = form;




  return (
    <div className="space-y-4">
      <AffiliationInfo />

      {/* 🔹 Campos del formulario */}
      <div className="space-y-3">
        <div>
          <Label>Titular</Label>
          <Input
            placeholder="Nombre del titular"
            {...register("holder")}
            maxLength={50}
            className="text-[16px]"

          />
          {errors.holder && (
            <p className="text-sm text-red-500">
              {String(errors.holder.message)}
            </p>
          )}
        </div>

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
