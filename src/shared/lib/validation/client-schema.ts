import { z } from "zod";

// Esquema de validación para el formulario de búsqueda de clientes
export const clientSearchSchema = z.object({
  documentType: z.string().min(1, "Debe seleccionar un tipo de documento"),
  documentNumber: z
    .string()
    .min(6, "El número de documento debe tener al menos 6 caracteres")
    .max(9, "El número de documento no puede tener más de 9 caracteres")
    .regex(/^\d+$/, "El número de documento solo puede contener números")
    .refine((val) => val.trim().length > 0, {
      message: "El número de documento es requerido",
    }),
});

// Tipo inferido del esquema
export type ClientSearchFormData = z.infer<typeof clientSearchSchema>;

// Validador para usar con TanStack Form
export const validateClientSearch = (data: unknown) => {
  try {
    clientSearchSchema.parse(data);
    return undefined; // Sin errores
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues.map((err: z.ZodIssue) => err.message).join(", ");
    }
    return "Error de validación";
  }
};

// Validadores de campo individual
export const documentTypeValidator = (value: string) => {
  if (!value || value.trim() === "") {
    return "Debe seleccionar un tipo de documento";
  }
  return undefined;
};

export const documentNumberValidator = (value: string) => {
  if (!value || value.trim() === "") {
    return "El número de documento es requerido";
  }

  if (!/^\d+$/.test(value)) {
    return "El número de documento solo puede contener números";
  }

  if (value.length < 6) {
    return "El número de documento debe tener al menos 6 caracteres";
  }

  if (value.length > 9) {
    return "El número de documento no puede tener más de 9 caracteres";
  }

  return undefined;
};
