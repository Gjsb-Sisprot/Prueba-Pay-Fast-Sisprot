import z from "zod";

// Schema base para selectedBank (no nullable)
const bankSchema = z.object({
  code: z.string().nonempty("Código del banco obligatorio"),
  name: z.string().nonempty("Nombre del banco obligatorio"),
});

export const debitoInmediatoSchema = z
  .object({
    selectedBank: bankSchema
      .nullable()
      .refine((val): val is z.infer<typeof bankSchema> => val !== null, {
        message: "Debe seleccionar un banco de la lista.",
      }),
    holderName: z.string().nonempty("Nombre del titular es obligatorio"),
    idNumber: z
      .string()
      .regex(/^[VEJG]\d{6,9}$/, "Documento debe ser V/E/J/G seguido de 6 a 9 dígitos"),
    contactMethod: z.enum(["telefono", "cuenta"]),
    phonePrefix: z.string().optional(),
    phoneNumber: z.string().optional(),
    accountNumber: z.string().optional(),
    otpCode: z
      .string()
      .optional()
      .refine((val) => !val || /^\d{8}$/.test(val), {
        message: "El código OTP debe tener 8 dígitos",
      }),
  })
  .superRefine((val, ctx) => {
    if (val.contactMethod === "telefono") {
      if (!val.phonePrefix || !/^(0412|0414|0424|0416|0426)$/.test(val.phonePrefix)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phonePrefix"],
          message: "Prefijo telefónico inválido",
        });
      }
      if (!val.phoneNumber || !/^\d{7}$/.test(val.phoneNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phoneNumber"],
          message: "El número debe tener exactamente 7 dígitos",
        });
      }
    } else if (val.contactMethod === "cuenta") {
      if (!val.accountNumber || !/^\d{20}$/.test(val.accountNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["accountNumber"],
          message: "La cuenta debe tener 20 dígitos",
        });
      }
    }
  });

// Tipo para el formulario (input) - permite null para selectedBank
export type DebitoInmediatoFormValues = {
  selectedBank: { code: string; name: string } | null;
  holderName: string;
  idNumber: string;
  contactMethod: "telefono" | "cuenta";
  phonePrefix?: string;
  phoneNumber?: string;
  accountNumber?: string;
  otpCode?: string;
};

// Tipo después de validación (output) - selectedBank nunca es null
export type ValidatedDebitoInmediatoValues = z.infer<typeof debitoInmediatoSchema>;
