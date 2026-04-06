"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { type Invoice } from "@/shared/lib/api-client";

type Item = NonNullable<Invoice["debit_inmediate_payment_info"]>[number];

export default function DebitImmediateModal({
  isOpen,
  items,
  onClose,
}: {
  isOpen: boolean;
  items: Item[];
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Pagos débito inmediato"
    >
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-auto rounded-xl shadow-xl bg-white border">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-lg">Pagos Débito Inmediato</h3>
          <div className="flex items-center gap-2">
            <button aria-label="Cerrar" onClick={onClose} className="text-sm px-3 py-1 bg-gray-100 rounded-md">
              Cerrar
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>Detalles de los débitos inmediatos asociados a esta factura.</div>
            </div>
          </div>

          {items.length === 0 && <p className="text-sm text-gray-600">No hay registros.</p>}

          {items.map((d) => (
            <div key={d.id} className="p-3 border rounded-md bg-gray-50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">Referencia</div>
                  <div className="text-xs text-gray-700 break-all">{d.reference ?? d.response_info?.Reference ?? "-"}</div>

                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                    <div>
                      <div className="font-medium">Monto</div>
                      <div>Bs. {Number(d.amount_bs || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                      <div className="font-medium">Estado</div>
                      <div>
                        {(() => {
                          const s = String(d.status ?? "").toLowerCase();
                          if (s === "failed" || s === "fail" || s === "fjct" ) {
                            return <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full">Fallido</span>;
                          }
                          if (s === "pending" || s === "pend" || s === "pendiente" || s === "p" ) {
                            return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">En verificación</span>;
                          }
                          if (s === "processed" || s === "proc" || s === "processed") {
                            return <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">Procesado</span>;
                          }
                          // fallback: show raw status capitalized
                          return <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full">{String(d.status ?? "").toString()}</span>;
                        })()}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Creado</div>
                      <div>{d.created_at ? new Date(d.created_at).toLocaleString() : "-"}</div>
                    </div>
                  </div>

                  {d.detail && <div className="mt-3 text-xs text-gray-600">Detalle: {d.detail}</div>}

         
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
