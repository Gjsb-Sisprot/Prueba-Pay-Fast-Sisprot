"use client";

import { useEffect, useState } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { useClientStore } from "@/shared/lib/store/client-store";
import { ChevronLeft, Info, Plus } from "lucide-react";
import { useAffiliateMethod } from "@/modules/methods/hooks/use-affiliated";
import { DataTable } from "@/shared/components/tablets/advance-table";
import { getColumns } from "@/modules/methods/components/crud-affiliated-methods/columns-table"
import { DataTableSkeleton } from "@/shared/components/tablets/table-skeleton";
import { PaymentAfiliationManualModal } from "./affiliation-method-manual-modal";
import { PaymentMethod as PaymentMethodItem } from "@/shared/types/affiliated-methods";


export default function CrudAffiliatedMethods() {
    const { setShowManagePayments, selectedClient } = useClientStore();
    const { loadAffiliateMethods, methods, loading, errorMessage } = useAffiliateMethod();
    const [showModal, setShowModal] = useState(false);
    const [editingMethod, setEditingMethod] = useState<PaymentMethodItem | null>(null);
    // false = no autoload, llamamos manualmente con useEffect

    // ✅ Llamar la función al montar el componente
    useEffect(() => {
        loadAffiliateMethods();
    }, [loadAffiliateMethods]);

    return (
        <div className="">
            {/* 🔹 Header con botón y título en una sola línea */}
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowManagePayments(false)}
                        className="flex items-center gap-2 bg-gray-500 text-white"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Volver 
                    </Button>
                    <h1 className="text-2xl font-semibold">Métodos Afiliados</h1>
                </div>

                {/* Botón para abrir el modal de afiliar (siempre visible) */}
                <div>
                    <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Afiliar método
                    </Button>
                </div>
            </div>

            {/* 🔹 Mensaje informativo */}
            <Alert className="bg-blue-50 border-blue-300 text-blue-900 mt-4">
                <Info className="h-5 w-5 text-blue-600" />
                <AlertTitle className="font-semibold">Afilia tu método de pago</AlertTitle>
                <AlertDescription className="space-y-3 text-sm">
                    <p>
                        Afilia tu método de pago común para que el sistema reconozca tus
                        pagos automáticamente. ¡Así no tendrás que reportarlos más desde el
                        portal!
                    </p>

                </AlertDescription>
            </Alert>

            <div className="mt-6">
                {loading && (
                    <div>
                    <p className="text-gray-500 text-sm mb-2">Cargando métodos afiliados...</p>
                    <DataTableSkeleton rows={5} columns={4} />
                    </div>
                )}

                {errorMessage && (
                    <p className="text-red-600 text-sm">⚠️ {errorMessage}</p>
                )}

                {!loading && !errorMessage && methods && methods.results?.length > 0 && (
                        <DataTable
                            columns={getColumns(loadAffiliateMethods, (m) => { setEditingMethod(m); setShowModal(true); })}
                            data={[...methods.results]}
                       
                        />
                )}

                {!loading && !errorMessage && methods && methods.results?.length === 0 && (
                    <p className="text-gray-500 text-sm">
                        No tienes métodos afiliados aún.
                    </p>
                )}
                                <PaymentAfiliationManualModal
                                    open={showModal}
                                    onClose={() => { setShowModal(false); setEditingMethod(null); }}
                                    client={selectedClient?.id}
                                    reloadMethods={loadAffiliateMethods}
                                    editingMethod={editingMethod ?? undefined}
                                />
            </div>

        </div>
    );
}
