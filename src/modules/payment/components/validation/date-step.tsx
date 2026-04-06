"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { useClientStore } from "@/shared/lib/store/client-store";
import { cn } from "@/shared/lib/utils";

interface PaymentDateStepProps {
  paymentMethod?: string;
}

export function PaymentDateStep({ paymentMethod }: PaymentDateStepProps = {}) {
  const { paymentDate, setPaymentDate, setValidationStep } = useClientStore();

  const [localSelectedDate, setLocalSelectedDate] = useState(paymentDate);

  // Generar las opciones de fecha (últimos 3 días) con manejo robusto de fechas
  const getDateOptions = () => {
    const dates = [];

    // Crear fecha actual en la zona horaria local
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (let i = 0; i < 3; i++) {
      // Crear cada fecha restando días a la fecha de hoy
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);

      const dayNames = [
        "domingo",
        "lunes",
        "martes",
        "miércoles",
        "jueves",
        "viernes",
        "sábado",
      ];
      const monthNames = [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
      ];

      let dayLabel = "";
      if (i === 0) {
        dayLabel = "Hoy";
      } else if (i === 1) {
        dayLabel = "Ayer";
      } else if (i === 2) {
        dayLabel = "Anteayer";
      } else {
        dayLabel = dayNames[targetDate.getDay()];
      }

      // Formatear fecha de manera consistente
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, "0");
      const day = String(targetDate.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;

      dates.push({
        value: formattedDate,
        label: dayLabel,
        day: targetDate.getDate(),
        month: monthNames[targetDate.getMonth()],
        fullLabel: dayLabel,
        dateObject: targetDate, // Guardamos el objeto Date para referencia
      });
    }

    return dates;
  };

  const dateOptions = getDateOptions();

  const handleDateSelect = (dateValue: string) => {
    setLocalSelectedDate(dateValue);
  };

  const handleConfirm = () => {
    if (localSelectedDate) {
      setPaymentDate(localSelectedDate);
      setValidationStep("amount");
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-center px-2">
        <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-2 leading-tight">
          Confirmar fecha de pago
        </h3>
        <p className="text-sm text-gray-600">
          Selecciona el día que realizaste el pago.
        </p>
      </div>

      <div className="space-y-3 px-2">
        {/* Date picker personalizado */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">
            Buscar otra fecha anterior
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-14 sm:h-12 justify-between px-4 font-normal rounded-xl"
              >
                <span
                  className={cn(
                    "truncate text-left",
                    !localSelectedDate && "text-gray-500"
                  )}
                >
                  {localSelectedDate
                    ? format(new Date(localSelectedDate + "T00:00:00"), "PPP", {
                        locale: es,
                      })
                    : "Selecciona una fecha"}
                </span>
                <CalendarIcon size={18} className="text-gray-400 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <Calendar
                mode="single"
                selected={
                  localSelectedDate
                    ? new Date(localSelectedDate + "T00:00:00")
                    : undefined
                }
                onSelect={(date) => {
                  if (date) {
                    // Crear fecha local sin problemas de zona horaria
                    const localDate = new Date(
                      date.getFullYear(),
                      date.getMonth(),
                      date.getDate()
                    );
                    const year = localDate.getFullYear();
                    const month = String(localDate.getMonth() + 1).padStart(
                      2,
                      "0"
                    );
                    const day = String(localDate.getDate()).padStart(2, "0");
                    const formattedDate = `${year}-${month}-${day}`;
                    setLocalSelectedDate(formattedDate);
                  }
                }}
                disabled={(date) => {
                  // Deshabilitar fechas futuras comparando solo fechas (sin hora)
                  const now = new Date();
                  const today = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate()
                  );
                  const checkDate = new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate()
                  );
                  return checkDate > today;
                }}
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>

        {dateOptions.map((option, index) => (
          <Button
            key={option.value}
            variant={localSelectedDate === option.value ? "default" : "outline"}
            onClick={() => handleDateSelect(option.value)}
            className="w-full h-auto p-4 sm:p-3 flex justify-between items-center rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="text-left">
              <div className="font-black text-base sm:text-sm">
                {index === 0
                  ? "Hoy"
                  : index === 1
                  ? "Ayer"
                  : index === 2
                  ? "Anteayer"
                  : option.fullLabel}
              </div>
            </div>
            <div className="text-right">
              <div className="font-black text-2xl sm:text-lg">{option.day}</div>
              <div className="text-sm text-gray-600 capitalize focus:text-gray-100">
                {option.month}
              </div>
            </div>
          </Button>
        ))}
      </div>

      <div className="flex gap-3 pt-3 px-2">
        <Button
          variant="outline"
          onClick={() => {
            // Para Zelle ir a titular, para otros métodos ir a banco
            const previousStep =
              paymentMethod === "zelle" ? "account-holder" : "bank";
            setValidationStep(previousStep);
          }}
          className="flex-1 h-12 font-black text-sm rounded-xl"
        >
          Paso anterior
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!localSelectedDate}
          className="flex-1 h-12 font-black text-sm rounded-xl disabled:opacity-50"
        >
          Confirmar fecha
        </Button>
      </div>
    </div>
  );
}
