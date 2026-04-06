import z from "zod";

// Schema base para selectedBank (no nullable)
const bankSchema = z.object({
  id: z.number().optional(),
  code: z.string().nonempty("Código del banco obligatorio"),
  name: z.string().nonempty("Nombre del banco obligatorio"),
});

export const paymentNationalSchema = z.object({
  date: z
    .string()
    .nonempty("La fecha es obligatoria")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Fecha inválida",
    }),
  selectedBank: bankSchema.nullable().refine(
    (val): val is z.infer<typeof bankSchema> => val !== null,
    { message: "Debe seleccionar un banco de la lista." }
  ),
  transferredAmount: z
    .string()
    .regex(
      /^\d+([.,]\d{1,2})?$/,
      "El monto debe ser un número válido con hasta dos decimales"
    ),
  referenceNumber: z
    .string()
    .regex(/^\d+$/, "La referencia debe contener solo números")
    .min(6, "El número de referencia debe tener al menos 6 dígitos"),
});

// Tipo para el formulario (input) - permite null para selectedBank
export type PaymentNationalFormValues = {
  date: string;
  selectedBank: { id?: number; code: string; name: string } | null;
  transferredAmount: string;
  referenceNumber: string;
};

// Tipo después de validación (output) - selectedBank nunca es null
export type ValidatedPaymentNationalValues = z.infer<typeof paymentNationalSchema>;
