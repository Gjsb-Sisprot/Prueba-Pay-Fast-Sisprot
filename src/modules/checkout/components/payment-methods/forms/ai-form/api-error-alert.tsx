"use client";

import { XCircle, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { ApiErrorAlertProps } from "./types";

export function ApiErrorAlert({ error, onDismiss }: ApiErrorAlertProps) {
  if (!error || !error.message) return null;

  // Determinar el color según el tipo de error
  const isWarning = error.status === "verification" || error.statusCode === 404;
  const bgColor = isWarning ? "bg-amber-50" : "bg-red-50";
  const borderColor = isWarning ? "border-amber-300" : "border-red-300";
  const textColor = isWarning ? "text-amber-800" : "text-red-800";
  const iconColor = isWarning ? "text-amber-600" : "text-red-600";

  return (
    <div
      className={`flex items-start gap-3 p-4 ${bgColor} border ${borderColor} rounded-lg relative`}
    >
      <XCircle className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
      <div className={`flex-1 text-sm ${textColor}`}>
        <p className="font-semibold mb-1">
          {isWarning ? "Pago no encontrado" : "Error al validar el pago"}
        </p>
        <p className="text-xs leading-relaxed">{error.message}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className={`p-1 h-auto ${textColor} hover:bg-transparent`}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
