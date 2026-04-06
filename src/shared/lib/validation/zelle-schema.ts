import z from "zod";

export const zelleSchema = z.object({
  date: z
    .string()
    .nonempty("La fecha es obligatoria")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Fecha inválida",
    }),
    sender: z
    .string()
    .nonempty("El nombre del titular es obligatorio")
    .min(3, "El nombre del titular debe tener al menos 3 caracteres"),
  transferredAmount: z
    .string()
    .regex(
      /^\d+([.,]\d{1,2})?$/,
      "El monto debe ser un número válido con hasta dos decimales"
    ),
  referenceNumber: z
    .string()
    .min(6, "El número de referencia debe tener al menos 6 caracteres"),
});

export type ZelleFormValues = z.infer<typeof zelleSchema>;
