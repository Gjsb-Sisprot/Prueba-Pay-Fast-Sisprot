"use client";

import { LoaderCircleIcon } from "lucide-react";
import type { SubmittingOverlayProps } from "./types";

export function SubmittingOverlay({ isVisible }: SubmittingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-xl">
      <LoaderCircleIcon className="w-16 h-16 text-yellow-600 animate-spin mb-4" />
      <p className="text-lg font-semibold text-gray-800">Validando pago...</p>
    </div>
  );
}
