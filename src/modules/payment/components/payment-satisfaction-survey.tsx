"use client";

import { useState } from "react";
import { Star, Clock } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useClientStore } from "@/shared/lib/store/client-store";
import { SkipSurveyModal } from "@/shared/components/modals/skip-survey-modal";

interface PaymentSatisfactionSurveyProps {
  isOpen: boolean;
  onClose: () => void;
  processDuration: number;
}

export function PaymentSatisfactionSurvey({
  isOpen,
  onClose,
  processDuration,
}: PaymentSatisfactionSurveyProps) {
  const [paymentRating, setPaymentRating] = useState<number>(0);
  const [internetRating, setInternetRating] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);

  const { selectedClient } = useClientStore();

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const submitSurvey = async () => {
    try {
      const payload = {
        paymentRating,
        internetRating,
        feedback,
        processDuration,
        clientId: selectedClient?.id || null,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Error al enviar feedback");

      const result = await response.json();
      console.log("Feedback enviado exitosamente:", result);
    } catch (error) {
      console.error("Error enviando encuesta:", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!paymentRating || !internetRating) return;

    setIsSubmitting(true);
    try {
      await submitSurvey();
      onClose();
    } catch (error) {
      console.error("Error al enviar la encuesta", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cuando el usuario hace clic en "Omitir encuesta", mostrar modal de confirmación
  const handleSkipClick = () => {
    setShowSkipConfirmation(true);
  };

  // Cuando confirma omitir desde el modal de confirmación
  const handleConfirmSkip = async () => {
    setShowSkipConfirmation(false);
    setIsSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentRating: "skip",
          internetRating: "skip",
          feedback: "",
          processDuration,
          clientId: selectedClient?.id || null,
          timestamp: new Date().toISOString(),
        }),
      });
      onClose();
    } catch {
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cuando decide continuar con la encuesta desde el modal de confirmación
  const handleContinueSurvey = () => {
    setShowSkipConfirmation(false);
  };

  const renderStars = (rating: number, setRating: (value: number) => void) => (
    <div className="flex justify-center gap-2 py-2">
      {[1, 2, 3, 4, 5].map((star) => {
        const value = star * 4; // 1★ = 4 pts, 5★ = 20 pts
        return (
          <Star
            key={star}
            className={`w-8 h-8 cursor-pointer transition-colors ${
              rating >= value ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
            }`}
            onClick={() => setRating(value)}
          />
        );
      })}
    </div>
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={(e: Event) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Star className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-black text-gray-900">
            Evalúa Tu Experiencia con Nosotros
          </DialogTitle>
          <div className="text-center pt-3">
            <p className="text-sm text-gray-700 mb-3">
              Tu opinión nos ayuda a mejorar continuamente nuestros servicios.
            </p>
            {processDuration > 0 && (
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-4">
                <Clock className="w-4 h-4" />
                <span>
                  Proceso completado en {formatDuration(processDuration)}
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-6">
          {/* ⭐ Evaluación de facilidad de pago */}
          <div className="space-y-2">
            <Label className="text-gray-900 font-semibold text-base">
              ¿Qué tan fácil fue realizar tu pago en nuestro portal?
            </Label>
            {renderStars(paymentRating, setPaymentRating)}
            <div className="text-xs text-gray-500 text-center">
              {paymentRating > 0 && `Tu calificación: ${paymentRating}/20`}
            </div>
          </div>

          {/* 🌐 Evaluación del servicio de Internet */}
          <div className="space-y-2">
            <Label className="text-gray-900 font-semibold text-base">
              ¿Cómo calificarías la calidad del servicio de Internet?
            </Label>
            {renderStars(internetRating, setInternetRating)}
            <div className="text-xs text-gray-500 text-center">
              {internetRating > 0 && `Tu calificación: ${internetRating}/20`}
            </div>
          </div>

          {/* 📝 Comentarios */}
          <div className="space-y-2">
            <Label htmlFor="feedback" className="text-gray-900 font-medium">
              ¿Cómo podemos mejorar tu experiencia? (opcional)
            </Label>
            <Textarea
              id="feedback"
              placeholder="Comparte tus comentarios o sugerencias..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[80px] resize-none rounded-lg"
              maxLength={500}
            />
            <div className="text-right text-xs text-gray-400">
              {feedback.length}/500
            </div>
          </div>

          {/* 🔘 Botones */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkipClick}
              className="flex-1 h-12 font-black text-sm rounded-xl"
              disabled={isSubmitting}
            >
              Omitir encuesta
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex-1 h-12 font-black text-sm rounded-xl"
              disabled={!paymentRating || !internetRating || isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Enviar evaluación"}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Modal de confirmación para omitir encuesta */}
      <SkipSurveyModal
        open={showSkipConfirmation}
        onClose={() => setShowSkipConfirmation(false)}
        onConfirmSkip={handleConfirmSkip}
        onContinueSurvey={handleContinueSurvey}
        isLoading={isSubmitting}
      />
    </Dialog>
  );
}
