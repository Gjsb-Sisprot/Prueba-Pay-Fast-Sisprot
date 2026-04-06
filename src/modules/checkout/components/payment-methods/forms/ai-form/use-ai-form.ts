"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { parse } from "date-fns";
import { useFileUpload, FileWithPreview } from "@/shared/hooks/use-file-upload";
import { useReceiptExtraction } from "@/modules/checkout/hooks/use-receipt-extraction";
import { useClientStore } from "@/shared/lib/store/client-store";
import { usePaymentFormStore } from "@/shared/lib/store/payment-form-store";
import { useBanks } from "@/shared/hooks/use-banks";
import {
  PaymentNationalFormValues,
  paymentNationalSchema,
} from "@/shared/lib/validation/payments-national-schema";
import type { Bank } from "@/shared/types/banks-data";
import type { MissingField, ApiValidationError } from "./types";

const MAX_SIZE_MB = 5;
const MAX_SIZE = MAX_SIZE_MB * 1024 * 1024;

export function useAIForm(
  onSubmitPayment: (data: PaymentNationalFormValues) => void
) {
  const { setReceiptFile, isSubmitting, paymentResult, setPaymentResult } = useClientStore();
  const { setFormValues } = usePaymentFormStore();
  const { extractData, isExtracting, extractionError, clearError } =
    useReceiptExtraction();
  const { banks: apiBanks } = useBanks();

  // Estado del formulario
  const [dataExtracted, setDataExtracted] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileWithPreview | null>(null);
  const [missingFields, setMissingFields] = useState<MissingField[]>([]);
  const [isInvalidReceipt, setIsInvalidReceipt] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [bankSearch, setBankSearch] = useState("");
  const [openPop, setOpenPop] = useState(false);
  const [openBankDropdown, setOpenBankDropdown] = useState(false);
  
  // Estado para errores de la API de validación
  const [apiError, setApiError] = useState<ApiValidationError | null>(null);

  // Form de react-hook-form
  const form = useForm<PaymentNationalFormValues>({
    resolver: zodResolver(paymentNationalSchema),
    defaultValues: {
      date: "",
      selectedBank: null,
      transferredAmount: "",
      referenceNumber: "",
    },
  });

  const { setValue, watch, handleSubmit } = form;
  const selectedBank = watch("selectedBank");
  const transferredAmount = watch("transferredAmount");
  const referenceNumber = watch("referenceNumber");

  // Calcular campos faltantes "efectivos" (solo los que están vacíos)
  const effectiveMissingFields = missingFields.filter((field) => {
    switch (field) {
      case "date":
        return !date;
      case "bankCode":
        return !selectedBank;
      case "amount":
        return !transferredAmount;
      case "referenceNumber":
        return !referenceNumber;
      default:
        return false;
    }
  });

  // Bancos filtrados
  const sourceBanks: Bank[] = apiBanks ?? [];
  const filteredBanks = sourceBanks.filter(
    (bank) =>
      bank.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
      bank.code.includes(bankSearch)
  );

  // Handler para cambios de archivos
  const handleFilesChange = useCallback(
    async (files: FileWithPreview[]) => {
      if (files.length > 0 && files[0].file instanceof File) {
        const file = files[0].file;
        setPreviewFile(files[0]);
        setReceiptFile(file);
        clearError();
        setMissingFields([]);
        setIsInvalidReceipt(false);

        // Extraer datos automáticamente con IA
        const extracted = await extractData(file);
        if (extracted) {
          // Verificar si faltan AMBOS campos críticos (monto Y referencia)
          // Esto indica que la imagen probablemente no es un comprobante de pago válido
          const missingAmount = !extracted.amount || extracted.amount.trim() === "";
          const missingReference = !extracted.referenceNumber || extracted.referenceNumber.trim() === "";
          
          if (missingAmount && missingReference) {
            // No es un comprobante válido - NO mostrar el formulario
            setIsInvalidReceipt(true);
            setDataExtracted(false);
            return;
          }

          setDataExtracted(true);

          // Guardar campos faltantes reportados por la IA
          if (
            extracted.missingFields &&
            Array.isArray(extracted.missingFields)
          ) {
            setMissingFields(extracted.missingFields as MissingField[]);
          }

          // Rellenar fecha
          if (extracted.date && extracted.date.trim() !== "") {
            try {
              const parsedDate = parse(extracted.date, "yyyy-MM-dd", new Date());
              if (!isNaN(parsedDate.getTime())) {
                setDate(parsedDate);
                setValue("date", extracted.date, { shouldValidate: true });
              }
            } catch {
              setMissingFields((prev) => [...prev, "date"]);
            }
          }

          // Rellenar banco
          if (
            extracted.bankCode &&
            extracted.bankCode.trim() !== "" &&
            apiBanks
          ) {
            const foundBank = apiBanks.find((b) => b.code === extracted.bankCode);
            if (foundBank) {
              setValue("selectedBank", foundBank, { shouldValidate: true });
              setBankSearch(`${foundBank.code} - ${foundBank.name}`);
            } else if (extracted.bankName && extracted.bankName.trim() !== "") {
              const foundByName = apiBanks.find((b) =>
                b.name.toLowerCase().includes(extracted.bankName.toLowerCase())
              );
              if (foundByName) {
                setValue("selectedBank", foundByName, { shouldValidate: true });
                setBankSearch(`${foundByName.code} - ${foundByName.name}`);
              }
            }
          }

          // Rellenar monto
          if (extracted.amount && extracted.amount.trim() !== "") {
            setValue("transferredAmount", extracted.amount, {
              shouldValidate: true,
            });
          }

          // Rellenar referencia
          if (
            extracted.referenceNumber &&
            extracted.referenceNumber.trim() !== ""
          ) {
            setValue("referenceNumber", extracted.referenceNumber, {
              shouldValidate: true,
            });
          }
        }
      } else {
        setPreviewFile(null);
        setReceiptFile(null);
        setDataExtracted(false);
        setMissingFields([]);
        setIsInvalidReceipt(false);
      }
    },
    [setReceiptFile, extractData, clearError, setValue, apiBanks]
  );

  // Configuración de upload de archivo
  const [
    { isDragging, errors: uploadErrors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ] = useFileUpload({
    accept: "image/png,image/jpeg,image/jpg,image/gif,image/webp",
    maxSize: MAX_SIZE,
    onFilesChange: handleFilesChange,
  });

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      setReceiptFile(null);
    };
  }, [setReceiptFile]);

  // Escuchar cambios en paymentResult para mostrar errores de la API
  // NOTA: status "verification" (404) NO se muestra como error, se deja avanzar al paso 4
  useEffect(() => {
    // Solo mostrar errores reales (no éxitos ni verificación)
    // "verification" (404) debe cerrar el modal y mostrar la pantalla de verificación en el paso 4
    if (
      paymentResult.status &&
      paymentResult.status !== "success" &&
      paymentResult.status !== "verification" &&
      paymentResult.message
    ) {
      setApiError({
        status: paymentResult.status,
        message: paymentResult.message,
        statusCode: paymentResult.statusCode || 0,
      });
    }
  }, [paymentResult]);

  // Limpiar error de API
  const clearApiError = useCallback(() => {
    setApiError(null);
    // También limpiar el paymentResult del store para que no se propague
    setPaymentResult({ status: null, message: "", statusCode: 0 });
  }, [setPaymentResult]);

  // Handler para cambio de fecha
  const handleDateChange = (selectedDate?: Date) => {
    setDate(selectedDate);
    if (selectedDate) {
      setValue("date", selectedDate.toISOString().split("T")[0], {
        shouldValidate: true,
      });
    }
    setOpenPop(false);
  };

  // Handler para selección de banco
  const handleBankSelect = (bank: Bank) => {
    setValue("selectedBank", bank, { shouldValidate: true });
    setBankSearch(`${bank.code} - ${bank.name}`);
    setOpenBankDropdown(false);
  };

  // Handler para submit
  const onSubmit = (data: PaymentNationalFormValues) => {
    setFormValues(data);
    onSubmitPayment(data);
  };

  // Handler para remover archivo
  const handleRemoveFile = () => {
    if (previewFile?.id) {
      removeFile(previewFile.id);
    }
    setPreviewFile(null);
    setReceiptFile(null);
    setDataExtracted(false);
    setMissingFields([]);
    setIsInvalidReceipt(false);
    setApiError(null);
    // Limpiar también el paymentResult del store
    setPaymentResult({ status: null, message: "", statusCode: 0 });
    form.reset();
    setDate(undefined);
    setBankSearch("");
  };

  return {
    // Form
    form,
    handleSubmit,
    onSubmit,

    // Estado
    dataExtracted,
    previewFile,
    missingFields,
    effectiveMissingFields,
    isInvalidReceipt,
    date,
    bankSearch,
    openPop,
    openBankDropdown,
    selectedBank,
    filteredBanks,

    // Estados de carga
    isExtracting,
    isSubmitting,
    extractionError,

    // Error de API de validación
    apiError,
    clearApiError,

    // Handlers de fecha y banco
    handleDateChange,
    handleBankSelect,
    setBankSearch,
    setOpenPop,
    setOpenBankDropdown,

    // Handlers de archivo
    handleRemoveFile,
    isDragging,
    uploadErrors,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    openFileDialog,
    getInputProps,

    // Constantes
    maxSizeMB: MAX_SIZE_MB,
  };
}
