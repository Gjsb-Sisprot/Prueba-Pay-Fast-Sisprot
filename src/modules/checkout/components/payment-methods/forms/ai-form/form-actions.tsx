"use client";

import { Button } from "@/shared/components/ui/button";
import { CheckCircle, LoaderCircleIcon } from "lucide-react";
import type { FormActionsProps } from "./types";

export function FormActions({ onClose, isSubmitting }: FormActionsProps) {
  return (
    <div className="mt-4 flex flex-row sm:justify-end gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        className="sm:w-auto w-full"
        disabled={isSubmitting}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        className="sm:w-auto w-full font-bold flex items-center justify-center gap-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <LoaderCircleIcon className="animate-spin" size={16} />
            Validando...
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5" />
            Reportar pago
          </>
        )}
      </Button>
    </div>
  );
}
