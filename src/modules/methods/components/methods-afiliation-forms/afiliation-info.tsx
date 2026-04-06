"use client";

import { Info, ChevronRight } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/shared/components/ui/alert";

export function AffiliationInfo() {
  return (
    <Alert className="bg-blue-50 border-blue-300 text-blue-900 mt-4">
      <Info className="h-5 w-5 text-blue-600" />
      <AlertTitle className="font-semibold">Afilia tu método de pago</AlertTitle>
      <AlertDescription className="space-y-3 text-sm">
        <ul className="mt-2 space-y-2 text-gray-700">
          <li className="flex items-start gap-2">
            <ChevronRight className="h-4 w-4 text-blue-600 mt-1" />
            <span>
              Esto le permitirá que identifiquemos de manera rápida y automática
              que el pago le pertenece a usted para el pago de su contrato.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="h-4 w-4 text-blue-600 mt-1" />
            <span>
              Si tiene más de dos contratos, deberá reportar manualmente cada
              pago. No aplica este proceso de afiliación.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="h-2 w-2 text-blue-600 mt-1" />
            <span>Próximamente podrá afiliar a cada contrato un método de pago.</span>
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export default AffiliationInfo;
