"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Gift, Star, AlertTriangle } from "lucide-react";

interface SkipSurveyModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmSkip: () => void;
  onContinueSurvey: () => void;
  isLoading?: boolean;
}

export function SkipSurveyModal({
  open,
  onClose,
  onConfirmSkip,
  onContinueSurvey,
  isLoading = false,
}: SkipSurveyModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-amber-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-black text-gray-900">
            ¿Estás seguro de omitir la encuesta?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-center text-gray-600 text-sm leading-relaxed">
            Tu opinión es muy valiosa para nosotros y nos ayuda a mejorar
            continuamente nuestros sistemas y servicios.
          </p>

          {/* Beneficios */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-200 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  ¡Gana puntos por completarla!
                </p>
                <p className="text-xs text-gray-600">
                  Acumula puntos que podrás canjear por premios y bonos exclusivos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  Mejora tu experiencia
                </p>
                <p className="text-xs text-gray-600">
                  Tus comentarios nos ayudan a ofrecerte un mejor servicio.
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-gray-500 text-xs">
            Solo toma unos segundos completar la encuesta.
          </p>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onConfirmSkip}
            className="w-full sm:w-auto font-semibold"
            disabled={isLoading}
          >
            Omitir de todos modos
          </Button>
          <Button
            onClick={onContinueSurvey}
            className="w-full sm:w-auto font-bold bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            Completar encuesta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
