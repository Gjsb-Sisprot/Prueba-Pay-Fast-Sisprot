"use client";

import { create } from "zustand";
import { PaymentNationalFormValues } from "@/shared/lib/validation/payments-national-schema";
import { ZelleFormValues } from "@/shared/lib/validation/zelle-schema";
import { DebitoInmediatoFormValues } from "@/shared/lib/validation/debito-inmediato-schema";
import { PaymentMethod } from "@/shared/types/payments-methos";

// Unimos los tipos posibles de formularios
export type PaymentFormValues = PaymentNationalFormValues | ZelleFormValues | DebitoInmediatoFormValues;

interface PaymentFormStore {
  formValues: PaymentFormValues | null;
  paymentMethod: PaymentMethod | null;

  // Setters
  setFormValues: (values: PaymentFormValues) => void;

  // Limpiar datos
  clearForm: () => void;
}

export const usePaymentFormStore = create<PaymentFormStore>((set) => ({
  formValues: null,
  paymentMethod: null,

  setFormValues: (values) => set({ formValues: values }),

  clearForm: () => set({ formValues: null, paymentMethod: null }),
}));
