"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { UseFormReturn } from "react-hook-form";
import { PaymentNationalFormValues } from "@/shared/lib/validation/payments-national-schema";

// Subcomponentes refactorizados
import { ExtractingOverlay } from "./ai-form/extracting-overlay";
import { SubmittingOverlay } from "./ai-form/submitting-overlay";
import { ImageUploadZone } from "./ai-form/image-upload-zone";
import { ImagePreview } from "./ai-form/image-preview";
import { MissingFieldsAlert } from "./ai-form/missing-fields-alert";
import { InvalidReceiptAlert } from "./ai-form/invalid-receipt-alert";
import { FormFields } from "./ai-form/form-fields";
import { FormActions } from "./ai-form/form-actions";
import { ApiErrorAlert } from "./ai-form/api-error-alert";
import { useAIForm } from "./ai-form/use-ai-form";

interface PaymentAIFormProps {
  form: UseFormReturn<PaymentNationalFormValues>;
  onClose: () => void;
  onSubmitPayment: (data: PaymentNationalFormValues) => void;
}

export function PaymentAIForm({ onClose, onSubmitPayment }: PaymentAIFormProps) {
  const {
    // Form
    form,
    handleSubmit,
    onSubmit,

    // Estado
    dataExtracted,
    previewFile,
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
    maxSizeMB,
  } = useAIForm(onSubmitPayment);

  return (
    <div className="relative">
      {/* Overlays de carga */}
      <ExtractingOverlay isVisible={isExtracting} />
      <SubmittingOverlay isVisible={isSubmitting} />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className={cn(
          "space-y-4",
          (isExtracting || isSubmitting) && "pointer-events-none opacity-50"
        )}
      >
        {/* Estado: Recibo inválido - No es un comprobante de pago */}
        {isInvalidReceipt ? (
          <>
            <InvalidReceiptAlert
              onUploadNewImage={handleRemoveFile}
              previewUrl={previewFile?.preview}
            />

            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-gray-500"
              >
                Cancelar
              </Button>
            </div>
          </>
        ) : !dataExtracted ? (
          /* Fase 1: Subir imagen */
          <>
            <ImageUploadZone
              maxSizeMB={maxSizeMB}
              isDragging={isDragging}
              uploadErrors={uploadErrors}
              extractionError={extractionError}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onOpenFileDialog={openFileDialog}
              getInputProps={getInputProps}
            />

            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-gray-500"
              >
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          /* Fase 2: Formulario con datos extraídos */
          <>
            {/* Error de la API de validación */}
            <ApiErrorAlert error={apiError} onDismiss={clearApiError} />

            <ImagePreview previewFile={previewFile} onRemove={handleRemoveFile} />

            <MissingFieldsAlert missingFields={effectiveMissingFields} />

            <FormFields
              form={form}
              date={date}
              bankSearch={bankSearch}
              openPop={openPop}
              openBankDropdown={openBankDropdown}
              selectedBank={selectedBank}
              filteredBanks={filteredBanks}
              missingFields={effectiveMissingFields}
              onDateChange={handleDateChange}
              onBankSearchChange={setBankSearch}
              onBankSelect={handleBankSelect}
              onOpenPopChange={setOpenPop}
              onOpenBankDropdownChange={setOpenBankDropdown}
            />

            <FormActions onClose={onClose} isSubmitting={isSubmitting} />
          </>
        )}
      </form>
    </div>
  );
}
