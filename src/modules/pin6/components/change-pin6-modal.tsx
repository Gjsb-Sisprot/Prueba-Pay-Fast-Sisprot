"use client";

import { useState, useRef } from "react";
import { OTPInput, SlotProps } from "input-otp";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { LoaderCircleIcon } from "lucide-react";
import { usePin6Change } from "@/modules/pin6/hooks/use-pin6";
import { REGEXP_ONLY_DIGITS } from "input-otp";

interface ChangePin6ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChangePin6Modal({ isOpen, onClose }: ChangePin6ModalProps) {
    const [oldPin, setOldPin] = useState("");
    const [newPin, setNewPin] = useState("");

    const {
        isValidatingOld,
        isOldPinValid,
        statusMessage,
        statusType,
        loadingSubmit,
        validateOldPin,
        changePin,
        resetStatus,
        setIsOldPinValid,
    } = usePin6Change();

    const oldPinRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleClose = () => {
        setOldPin("");
        setNewPin("");
        setIsOldPinValid(false);
        resetStatus();
        onClose();
    };

    const handleSubmit = async () => {
        const ok = await changePin(newPin);
        if (ok) {
            setTimeout(() => {
                handleClose();
            }, 1000); 
        }
    };

    const isSubmitDisabled = !isOldPinValid || newPin.length !== 6 || loadingSubmit;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000]">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-6 shadow-xl">
                <h3 className="text-lg font-bold text-center mt-2">
                    Cambiar PIN6
                </h3>

                {/* Instrucciones */}
                <div className="text-justify text-gray-700 text-sm space-y-1">
                    <p>1. Ingresa tu PIN6 actual.</p>
                    <p>2. Si es correcto podrás ingresar tu nuevo PIN6.</p>
                    <p>3. Confirma para actualizarlo.</p>
                </div>

                <div className="space-y-4">
                    {/* PIN6 Actual */}
                    <div className="text-center space-y-2">
                        <p className="text-sm font-semibold">PIN6 actual</p>

                        <div className="flex justify-center">
                            <OTPInput
                                value={oldPin}
                                onChange={(val) => {
                                    setOldPin(val);
                                    validateOldPin(val);
                                }}
                                ref={oldPinRef}
                                maxLength={6}
                                disabled={loadingSubmit}
                                render={({ slots }) => (
                                    <div className="flex gap-2">
                                        {slots.map((slot, idx) => (
                                            <PinSlot key={idx} {...slot} />
                                        ))}
                                    </div>
                                )}
                                pattern={REGEXP_ONLY_DIGITS}
                            />
                        </div>

                        {isValidatingOld && (
                            <p className="text-blue-600 text-sm flex items-center justify-center gap-2">
                                <LoaderCircleIcon className="animate-spin" size={16} />
                                Validando PIN...
                            </p>
                        )}
                    </div>

                    {/* PIN6 Nuevo */}
                    <div className="text-center space-y-2">
                        <p className="text-sm font-semibold">Nuevo PIN6</p>

                        <div
                            className={cn(
                                "flex justify-center transition-opacity",
                                !isOldPinValid && "opacity-40 pointer-events-none"
                            )}
                        >
                            <OTPInput
                                value={newPin}
                                onChange={(v) => {
                                    setNewPin(v);
                                    resetStatus();
                                }}
                                maxLength={6}
                                disabled={!isOldPinValid}
                                render={({ slots }) => (
                                    <div className="flex gap-2">
                                        {slots.map((slot, idx) => (
                                            <PinSlot key={idx} {...slot} />
                                        ))}
                                    </div>
                                )}
                                pattern={REGEXP_ONLY_DIGITS}
                                
                            />
                        </div>
                    </div>
                </div>

                {/* ✅ Mensaje de estado unificado */}
                {statusMessage && (
                    <p
                        className={cn(
                            "text-center text-sm p-2 rounded-md border",
                            statusType === "error" &&
                            "text-red-600 bg-red-50 border-red-200",
                            statusType === "success" &&
                            "text-green-600 bg-green-50 border-green-200"
                        )}
                    >
                        {statusMessage}
                    </p>
                )}

                {/* Botones */}
                <div className="flex items-center gap-3">
                    <Button
                        disabled={isSubmitDisabled}
                        onClick={handleSubmit}
                        className="w-1/2 h-12 "
                    >
                        {loadingSubmit ? "Procesando..." : "Cambiar PIN"}
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleClose}
                        className="w-1/2 h-12 border-red-500 text-red-600 hover:bg-red-100 "
                    >
                        Cancelar
                    </Button>
                </div>
            </div>
        </div>
    );
}

function PinSlot(props: SlotProps) {
    return (
        <div
            className={cn(
                "border-input bg-background flex size-10 items-center justify-center rounded-md border text-lg font-bold shadow-xs transition-colors",
                props.isActive ? "border-blue-500" : "border-gray-400"
            )}
        >
            {props.char !== null && <div>{props.char}</div>}
        </div>
    );
}
