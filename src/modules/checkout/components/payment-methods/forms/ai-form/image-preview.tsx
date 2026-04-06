"use client";

import Image from "next/image";
import { XIcon, CheckCircle } from "lucide-react";
import type { ImagePreviewProps } from "./types";

export function ImagePreview({ previewFile, onRemove }: ImagePreviewProps) {
  if (!previewFile?.preview) return null;

  return (
    <div className="relative rounded-xl overflow-hidden border bg-gray-50">
      <div className="relative h-32 w-full">
        <Image
          src={previewFile.preview}
          alt="Comprobante"
          fill
          className="object-contain"
          unoptimized
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
        >
          <XIcon className="size-4" />
        </button>
      </div>
      <div className="p-2 text-center bg-green-50 border-t border-green-200">
        <div className="flex items-center justify-center gap-1 text-green-700 text-sm font-medium">
          <CheckCircle className="w-4 h-4" />
          Datos extraídos con IA - Verifica la información
        </div>
      </div>
    </div>
  );
}
