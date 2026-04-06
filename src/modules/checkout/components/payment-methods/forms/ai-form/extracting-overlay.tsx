"use client";

import { LoaderCircleIcon, Sparkles } from "lucide-react";
import type { ExtractingOverlayProps } from "./types";

export function ExtractingOverlay({ isVisible }: ExtractingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-xl">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
        <LoaderCircleIcon className="w-8 h-8 text-black animate-spin" />
      </div>
      <p className="text-lg font-semibold text-gray-800 text-center">
        Analizando comprobante con IA...
      </p>
      <p className="text-sm text-gray-500 mt-1">
        Extrayendo datos automáticamente
      </p>
    </div>
  );
}
