"use client";

import { Button } from "@/shared/components/ui/button";
import { FileWarning, UploadIcon, RefreshCw } from "lucide-react";
import Image from "next/image";
import type { InvalidReceiptAlertProps } from "./types";

export function InvalidReceiptAlert({
  onUploadNewImage,
  previewUrl,
}: InvalidReceiptAlertProps) {
  return (
    <div className="space-y-4">
      {/* Vista previa de la imagen rechazada con overlay */}
      {previewUrl && (
        <div className="relative rounded-xl overflow-hidden border border-red-200 h-40">
          <div className="absolute inset-0 bg-red-900/70 z-10 flex items-center justify-center">
            <FileWarning className="w-16 h-16 text-white/80" />
          </div>
          <Image
            src={previewUrl}
            alt="Imagen no válida"
            fill
            className="object-cover opacity-50"
            unoptimized
          />
        </div>
      )}

      {/* Alerta de error */}
      <div className="p-4 bg-red-50 border border-red-300 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <FileWarning className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-red-800 text-base">
              Esto no parece ser un comprobante de pago
            </h4>
            <p className="text-sm text-red-700 mt-1 leading-relaxed">
              No se detectaron datos esenciales como el{" "}
              <span className="font-semibold">monto</span> ni el{" "}
              <span className="font-semibold">número de referencia</span>.
            </p>
            <p className="text-xs text-red-600 mt-2">
              Por favor, sube una imagen clara del comprobante de tu pago
              bancario (captura de pantalla o foto).
            </p>
          </div>
        </div>
      </div>

      {/* Botón para subir nueva imagen */}
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="default"
          className="w-full h-12 font-semibold"
          onClick={onUploadNewImage}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Subir otra imagen
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full text-gray-500"
          onClick={onUploadNewImage}
        >
          <UploadIcon className="w-4 h-4 mr-2" />
          Seleccionar archivo diferente
        </Button>
      </div>
    </div>
  );
}
