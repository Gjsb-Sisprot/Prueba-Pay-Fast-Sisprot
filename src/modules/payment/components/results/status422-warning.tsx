"use client";

import { Clock, AlertCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useClientStore } from "@/shared/lib/store/client-store";
import { useEffect, useRef } from "react";

interface PaymentResultVerificationProps {
    message?: string;
    statusCode?: number;
}

export function Status422Warning({message }: PaymentResultVerificationProps) {
    const {
        showSurvey,
        setShowSurvey,
        endProcess,
        goContract
    } = useClientStore();

    // Ref para evitar que endProcess se ejecute múltiples veces
    const hasProcessEnded = useRef(false);

    // useEffect separado para endProcess (se ejecuta solo una vez)
    useEffect(() => {
        if (!hasProcessEnded.current) {
            endProcess();
            hasProcessEnded.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Sin dependencias para que se ejecute solo una vez

    // useEffect separado para mostrar la encuesta (se ejecuta solo cuando no está visible)
    useEffect(() => {
        if (!showSurvey) {
            setShowSurvey(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Sin dependencias, se ejecuta solo al montar el componente





    return (
        <>
            <div className="space-y-6 max-w-md mx-auto text-center">
                {/* Verification Icon */}
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Clock className="w-12 h-12 text-yellow-600" />
                    </div>
                </div>

                {/* Header */}
                <div className="space-y-3">
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                        Resultado del Pago
                    </h3>

                </div>

                {/* Verification Details */}
                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 space-y-3">
                    <div className="flex items-left  gap-2 text-yellow-800">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm font-medium">
                            No se proceso el pago porque {message}

                        </p>
                    </div>
                 
                </div>

                {/* Action Button */}
                <div className="pt-4">
                    <Button
                        onClick={goContract}
                        className="w-full h-14 font-black text-base rounded-xl bg-yellow-600 text-white hover:bg-yellow-700"
                    >
                        Entendido, volver al inicio
                    </Button>
                </div>
            </div>


        </>
    );
}
