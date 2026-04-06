"use client";

import { AlertTriangle } from "lucide-react";
import type { MissingFieldsAlertProps } from "./types";

export function MissingFieldsAlert({ missingFields }: MissingFieldsAlertProps) {
  if (missingFields.length === 0) return null;

  return (
    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-amber-800">
        <p className="font-medium">
          Algunos datos no se encontraron en la imagen
        </p>
        <p className="text-amber-600 text-xs mt-1">
          Completa manualmente los campos marcados en rojo.
        </p>
      </div>
    </div>
  );
}
