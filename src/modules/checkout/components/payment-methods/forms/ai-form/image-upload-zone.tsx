"use client";

import { Button } from "@/shared/components/ui/button";
import { ImageIcon, UploadIcon, AlertCircle, Sparkles } from "lucide-react";
import type { ImageUploadZoneProps } from "./types";

export function ImageUploadZone({
  maxSizeMB,
  isDragging,
  uploadErrors,
  extractionError,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onOpenFileDialog,
  getInputProps,
}: ImageUploadZoneProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-center justify-center">
        <Sparkles className="w-5 h-5 text-yellow-500" />
        <p className="text-sm font-medium text-gray-700">
          Sube tu comprobante y la IA extraerá los datos automáticamente
        </p>
      </div>

      <div
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        data-dragging={isDragging || undefined}
        className="border-input data-[dragging=true]:bg-accent/50 has-[input:focus]:border-ring has-[input:focus]:ring-ring/50 relative flex min-h-48 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-4 transition-colors has-[input:focus]:ring-[3px] cursor-pointer hover:bg-gray-50"
        onClick={onOpenFileDialog}
      >
        <input
          {...getInputProps()}
          className="sr-only"
          aria-label="Subir comprobante de pago"
        />
        <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
          <div className="bg-black mb-3 flex size-14 shrink-0 items-center justify-center rounded-full">
            <ImageIcon className="size-6 text-white" />
          </div>
          <p className="mb-1.5 text-base font-semibold">
            Arrastra tu comprobante aquí
          </p>
          <p className="text-muted-foreground text-xs mb-4">
            PNG, JPG, GIF, WebP (máx. {maxSizeMB}MB)
          </p>
          <Button type="button" variant="outline" className="mt-2">
            <UploadIcon className="-ms-1 me-2 size-4" />
            Seleccionar archivo
          </Button>
        </div>
      </div>

      {uploadErrors.length > 0 && (
        <div className="text-red-600 flex items-center gap-1 text-xs">
          <AlertCircle className="size-3" />
          <span>{uploadErrors[0]}</span>
        </div>
      )}

      {extractionError && (
        <div className="text-red-600 flex items-center gap-1 text-xs bg-red-50 p-2 rounded">
          <AlertCircle className="size-3" />
          <span>{extractionError}</span>
        </div>
      )}
    </div>
  );
}
