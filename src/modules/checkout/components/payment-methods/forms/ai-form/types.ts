import type { UseFormReturn } from "react-hook-form";
import type { PaymentNationalFormValues } from "@/shared/lib/validation/payments-national-schema";
import type { FileWithPreview } from "@/shared/hooks/use-file-upload";
import type { Bank } from "@/shared/types/banks-data";

// Campos que pueden faltar en la extracción
export type MissingField = "date" | "bankCode" | "amount" | "referenceNumber";

// Props principales del formulario AI
export interface PaymentAIFormProps {
  form: UseFormReturn<PaymentNationalFormValues>;
  onClose: () => void;
  onSubmitPayment: (data: PaymentNationalFormValues) => void;
}

// Estado del formulario AI
export interface AIFormState {
  dataExtracted: boolean;
  previewFile: FileWithPreview | null;
  missingFields: MissingField[];
  date: Date | undefined;
  bankSearch: string;
  openPop: boolean;
  openBankDropdown: boolean;
}

// Props para el overlay de extracción
export interface ExtractingOverlayProps {
  isVisible: boolean;
}

// Props para el overlay de envío
export interface SubmittingOverlayProps {
  isVisible: boolean;
}

// Props para la zona de upload
export interface ImageUploadZoneProps {
  maxSizeMB: number;
  isDragging: boolean;
  uploadErrors: string[];
  extractionError: string | null;
  onDragEnter: (e: React.DragEvent<HTMLElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLElement>) => void;
  onDrop: (e: React.DragEvent<HTMLElement>) => void;
  onOpenFileDialog: () => void;
  getInputProps: () => React.InputHTMLAttributes<HTMLInputElement>;
}

// Props para la preview de imagen
export interface ImagePreviewProps {
  previewFile: FileWithPreview | null;
  onRemove: () => void;
}

// Props para la alerta de campos faltantes
export interface MissingFieldsAlertProps {
  missingFields: MissingField[];
}

// Props para los campos del formulario
export interface FormFieldsProps {
  form: UseFormReturn<PaymentNationalFormValues>;
  date: Date | undefined;
  bankSearch: string;
  openPop: boolean;
  openBankDropdown: boolean;
  selectedBank: Bank | null;
  filteredBanks: Bank[];
  missingFields: MissingField[];
  onDateChange: (date?: Date) => void;
  onBankSearchChange: (search: string) => void;
  onBankSelect: (bank: Bank) => void;
  onOpenPopChange: (open: boolean) => void;
  onOpenBankDropdownChange: (open: boolean) => void;
}

// Props para las acciones del formulario
export interface FormActionsProps {
  onClose: () => void;
  isSubmitting: boolean;
}

// Tipo para el error de validación de la API
export interface ApiValidationError {
  status: string | null;
  message: string;
  statusCode: number;
}

// Props para la alerta de error de API
export interface ApiErrorAlertProps {
  error: ApiValidationError | null;
  onDismiss: () => void;
}

// Props para la alerta de recibo inválido
export interface InvalidReceiptAlertProps {
  onUploadNewImage: () => void;
  previewUrl?: string;
}
