import { z } from "zod";

// Schema base para selectedBank (no nullable)
const bankSchema = z.object({
  id: z.number().optional(),
  code: z.string().nonempty("Código del banco obligatorio"),
  name: z.string().nonempty("Nombre del banco obligatorio"),
});

export const pagoMovilSchema = z.object({
  cod: z.string().nonempty("Código requerido"),
  phone: z
    .string()
    .regex(/^\d{7}$/, "Debe tener 7 dígitos"),
  name: z.string().nonempty("El Alias es requerido"),
  documentType: z.string().min(1, "Debe seleccionar un tipo de documento"),
  documentNumber: z
    .string()
    .min(6, "El número de documento debe tener al menos 6 caracteres")
    .max(9, "El número de documento no puede tener más de 9 caracteres")
    .regex(/^\d+$/, "El número de documento solo puede contener números")
    .refine((val) => val.trim().length > 0, {
      message: "El número de documento es requerido",
    }),
  selectedBank: bankSchema.nullable().refine(
    (val): val is z.infer<typeof bankSchema> => val !== null,
    { message: "Debe seleccionar un banco de la lista." }
  ),
});

export const transferenciaSchema = z.object({
  account: z
    .string()
    .regex(/^\d{4}-\d{4}-\d{4}-\d{4}-\d{4}$/, "Debe tener 20 dígitos con guiones"),
  name: z.string().nonempty("El Alias es requerido"),
  documentType: z.string().min(1, "Debe seleccionar un tipo de documento"),
  documentNumber: z
    .string()
    .min(6, "El número de documento debe tener al menos 6 caracteres")
    .max(9, "El número de documento no puede tener más de 9 caracteres")
    .regex(/^\d+$/, "El número de documento solo puede contener números")
    .refine((val) => val.trim().length > 0, {
      message: "El número de documento es requerido",
    }),
  selectedBank: bankSchema.nullable().refine(
    (val): val is z.infer<typeof bankSchema> => val !== null,
    { message: "Debe seleccionar un banco de la lista." }
  ),
});

export const zelleSchema = z.object({
  holder: z.string().nonempty("Titular requerido"),
  name: z.string().nonempty("El Alias es requerido"),
});

export type PaymentMethod = "pago-movil" | "transferencia" | "zelle";

export const getSchemaByMethod = (method: PaymentMethod) => {
  switch (method) {
    case "pago-movil":
      return pagoMovilSchema;
    case "transferencia":
      return transferenciaSchema;
    case "zelle":
      return zelleSchema;
    default:
      return pagoMovilSchema;
  }
};

// Tipos para el formulario (input) - permite null para selectedBank
export type PagoMovilValues = {
  cod: string;
  phone: string;
  name: string;
  documentType: string;
  documentNumber: string;
  selectedBank: { id?: number; code: string; name: string } | null;
};

export type TransferenciaValues = {
  account: string;
  name: string;
  documentType: string;
  documentNumber: string;
  selectedBank: { id?: number; code: string; name: string } | null;
};

export type ZelleValues = z.infer<typeof zelleSchema>;

// Tipos después de validación (output) - selectedBank nunca es null
export type ValidatedPagoMovilValues = z.infer<typeof pagoMovilSchema>;
export type ValidatedTransferenciaValues = z.infer<typeof transferenciaSchema>;

/**
 * Tipo general que combina todos los posibles valores
 * para usar en contextos más genéricos (por ejemplo, en el modal)
 */
export type AfiliationValues =
  | PagoMovilValues
  | TransferenciaValues
  | ZelleValues;

