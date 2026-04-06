"use client";

import {
  AlertCircleIcon,
  ImageIcon,
  UploadIcon,
  XIcon,
  CheckCircle,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/shared/components/ui/button";
import { useFileUpload, FileWithPreview } from "@/shared/hooks/use-file-upload";
import { useClientStore } from "@/shared/lib/store/client-store";
import {
  validateAndRegisterPayment,
  fileToBase64,
  getFileExtension,
} from "@/shared/lib/api/payments";
import { useState, useEffect, useCallback } from "react";

interface PaymentReceiptStepProps {
  paymentMethod?: string;
}

export function PaymentReceiptStep({
  paymentMethod,
}: PaymentReceiptStepProps = {}) {
  const {
    setReceiptFile,
    nextStep,
    selectedInvoice,
    referenceNumber,
    selectedBank,
    accountHolder,
    paymentDate,
    transferredAmount,
    paymentResult,
    setPaymentResult,
    setValidationStep,
  } = useClientStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Effect para avanzar al siguiente paso SOLO cuando el pago es exitoso
  useEffect(() => {
    if (paymentResult.status === "success") {
      // Usar setTimeout para evitar actualizaciones síncronas de estado
      const timer = setTimeout(() => {
        nextStep();
      }, 100);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentResult.status]); // Remover nextStep de dependencias para evitar re-ejecutiones innecesarias

  const maxSizeMB = 5;
  const maxSize = maxSizeMB * 1024 * 1024; // 5MB para comprobantes

  // Usar useCallback para estabilizar onFilesChange y evitar bucles infinitos
  const handleFilesChange = useCallback(
    (files: FileWithPreview[]) => {
      if (files.length > 0 && files[0].file instanceof File) {
        setReceiptFile(files[0].file);
      } else {
        setReceiptFile(null);
      }
      // Limpiar errores cuando se selecciona un nuevo archivo
      setSubmitError(null);
    },
    [setReceiptFile, setSubmitError]
  );

  const [
    { files, isDragging, errors },
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
    accept: "image/png,image/jpeg,image/jpg,image/gif,image/webp", // Removemos PDF y SVG para simplificar
    maxSize,
    onFilesChange: handleFilesChange, // Usar la función estabilizada
  });

  const previewUrl = files[0]?.preview || null;
  const fileName = files[0]?.file.name || null;

  // Función para enviar el pago a la API
  const submitPayment = async () => {
    if (!files[0] || !selectedInvoice) {
      setSubmitError("Faltan datos necesarios para procesar el pago");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const file = files[0].file;
      if (!(file instanceof File)) {
        throw new Error("Archivo no válido");
      }

      // Convertir archivo a base64 usando la función importada
      const base64Image = await fileToBase64(file);
      const fileExtension = getFileExtension(file);

      // Usar la función de API importada
      const result = await validateAndRegisterPayment({
        paymentMethod: paymentMethod || "transferencia",
        invoiceId: parseInt(selectedInvoice.id.toString()),
        date: paymentDate,
        transferredAmount: transferredAmount || "0",
        referenceNumber,
        selectedBank,
        accountHolder,
        base64Image,
        fileExtension,
      });

      // Manejar diferentes códigos de estado
      if (result.status === 201) {
        // Éxito
        setPaymentResult({
          status: "success",
          statusCode: result.status,
          message: result.message,
        });
      } else if ([400, 404, 422].includes(result.status)) {
        // En verificación
        setPaymentResult({
          status: "verification",
          statusCode: result.status,
          message: result.message,
        });
      } else if (result.status === 500) {
        // Error del servidor
        setPaymentResult({
          status: "error",
          statusCode: result.status,
          message: result.message,
        });
      } else {
        // Otros errores no manejados
        setPaymentResult({
          status: "error",
          statusCode: result.status,
          message: result.message || "Error desconocido",
        });
      }
    } catch (error) {
      console.error("Error al procesar el pago:", error);
      // En caso de error de red o otro error, mostrar pantalla de error
      setPaymentResult({
        status: "error",
        statusCode: 500,
        message: error instanceof Error ? error.message : "Error de conexión",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para continuar sin comprobante
  const continueWithoutReceipt = async () => {
    if (!selectedInvoice) {
      setSubmitError("Faltan datos necesarios para procesar el pago");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Usar la función de API importada sin archivo
      const result = await validateAndRegisterPayment({
        paymentMethod: paymentMethod || "transferencia",
        invoiceId: parseInt(selectedInvoice.id.toString()),
        date: paymentDate,
        transferredAmount: transferredAmount || "0",
        referenceNumber,
        selectedBank,
        accountHolder,
        // No enviar base64Image ni fileExtension cuando no hay archivo
      });

      // Manejar diferentes códigos de estado
      if (result.status === 201) {
        // Éxito
        setPaymentResult({
          status: "success",
          statusCode: result.status,
          message: result.message,
        });
      } else if ([400, 404, 422].includes(result.status)) {
        // En verificación
        setPaymentResult({
          status: "verification",
          statusCode: result.status,
          message: result.message,
        });
      } else if (result.status === 500) {
        // Error del servidor
        setPaymentResult({
          status: "error",
          statusCode: result.status,
          message: result.message,
        });
      } else {
        // Otros errores no manejados
        setPaymentResult({
          status: "error",
          statusCode: result.status,
          message: result.message || "Error desconocido",
        });
      }
    } catch (error) {
      console.error("Error al procesar el pago sin comprobante:", error);
      // En caso de error de red o otro error, mostrar pantalla de error
      setPaymentResult({
        status: "error",
        statusCode: 500,
        message: error instanceof Error ? error.message : "Error de conexión",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center px-2">
        <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 leading-tight">
          Comprobante de pago (opcional)
        </h3>
        <p className="text-sm sm:text-base text-gray-600">
          Puedes subir una foto del comprobante de pago para facilitar la
          validación de tu transacción.
        </p>
      </div>

      {/* Upload Area */}
      <div className="px-4">
        <div className="relative">
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            data-dragging={isDragging || undefined}
            className="border-input data-[dragging=true]:bg-accent/50 has-[input:focus]:border-ring has-[input:focus]:ring-ring/50 relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed p-4 transition-colors has-[input:focus]:ring-[3px]"
          >
            <input
              {...getInputProps()}
              className="sr-only"
              aria-label="Subir comprobante de pago (opcional)"
            />
            {previewUrl ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <Image
                  src={previewUrl}
                  alt={fileName || "Comprobante subido"}
                  width={500}
                  height={300}
                  className="mx-auto max-h-full rounded object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
                <div
                  className="bg-background mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border"
                  aria-hidden="true"
                >
                  <ImageIcon className="size-4 opacity-60" />
                </div>
                <p className="mb-1.5 text-sm font-medium">
                  Arrastra tu comprobante aquí
                </p>
                <p className="text-muted-foreground text-xs mb-4">
                  PNG, JPG, GIF, WebP (máx. {maxSizeMB}MB)
                </p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={openFileDialog}
                >
                  <UploadIcon
                    className="-ms-1 me-2 size-4 opacity-60"
                    aria-hidden="true"
                  />
                  Seleccionar archivo
                </Button>
              </div>
            )}
          </div>

          {previewUrl && (
            <div className="absolute top-4 right-4">
              <button
                type="button"
                className="focus-visible:border-ring focus-visible:ring-ring/50 z-50 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:ring-[3px]"
                onClick={() => removeFile(files[0]?.id)}
                aria-label="Quitar comprobante"
                disabled={isSubmitting}
              >
                <XIcon className="size-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {errors.length > 0 && (
          <div
            className="text-destructive flex items-center gap-1 text-xs mt-2"
            role="alert"
          >
            <AlertCircleIcon className="size-3 shrink-0" />
            <span>{errors[0]}</span>
          </div>
        )}

        {submitError && (
          <div
            className="text-red-600 flex items-center gap-1 text-xs mt-2 bg-red-50 p-2 rounded"
            role="alert"
          >
            <AlertCircleIcon className="size-3 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {files.length > 0 && !errors.length && !submitError && (
          <div className="flex items-center gap-1 text-xs mt-2 text-green-600">
            <CheckCircle className="size-3 shrink-0" />
            <span>Comprobante listo para enviar</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 space-y-3">
        {/* Botón para ir hacia atrás */}
        <Button
          variant="outline"
          onClick={() => setValidationStep("confirmation")}
          className="w-full h-12 font-black text-sm rounded-xl"
          disabled={isSubmitting}
        >
          Paso anterior
        </Button>

        {/* Botón para validar con comprobante */}
        <Button
          onClick={submitPayment}
          className="w-full h-14 font-black text-base rounded-xl bg-black text-white hover:bg-gray-800 disabled:bg-gray-400"
          disabled={files.length === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando pago...
            </>
          ) : (
            "Validar con comprobante"
          )}
        </Button>

        {/* Botón para continuar sin comprobante */}
        <Button
          onClick={continueWithoutReceipt}
          className="w-full h-12 font-black text-base rounded-xl bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-400"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando pago...
            </>
          ) : (
            "Continuar sin comprobante"
          )}
        </Button>

        <p className="text-xs text-center text-gray-500 mt-3">
          El comprobante es opcional. Puedes subirlo ahora o continuar sin él.
        </p>
      </div>
    </div>
  );
}
