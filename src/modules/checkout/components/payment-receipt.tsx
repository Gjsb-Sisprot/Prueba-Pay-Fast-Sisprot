"use client";

import {
  AlertCircleIcon,
  ImageIcon,
  UploadIcon,
  XIcon,
  CheckCircle,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/shared/components/ui/button";
import { useFileUpload, FileWithPreview } from "@/shared/hooks/use-file-upload";
import { useClientStore } from "@/shared/lib/store/client-store";
import { useState, useEffect, useCallback} from "react";

interface PaymentReceiptProps {
  title?: string;
  message?: string;
}

export function PaymentReceipt({
  title = "Comprobante de pago (opcional)",
  message = "Puedes subir una foto del comprobante de pago para facilitar la validación de tu transacción." }
  : PaymentReceiptProps) {
  const {
    setReceiptFile,
    nextStep,
    paymentResult,
  } = useClientStore();

  const [isSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    // Limpiar el archivo de recibo y errores al montar el componente
    setReceiptFile(null);
    setSubmitError(null);
  }, [setReceiptFile]);

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

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center px-2">
        <h3 className="text-xl sm:text-lg font-black text-gray-900 mb-2 leading-tight">
          {title}

        </h3>
        <p className="text-sm sm:text-sm text-gray-600">
          {message}

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
                  type="button"
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
    </div>
  );
}
