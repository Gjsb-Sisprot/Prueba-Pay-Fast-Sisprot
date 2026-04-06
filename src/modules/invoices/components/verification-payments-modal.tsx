"use client";

import React from "react";
import { useVerificationPayments } from "@/shared/hooks/use-verification-payments";
import { useClientStore } from "@/shared/lib/store/client-store";
import { clientService } from "@/shared/lib/api-client";
import { useRouter } from "next/navigation";
import type { VerificationPaymentData } from "@/shared/types/verification-payments.types";
import { AlertCircle, CreditCard, Phone, Mail, User, DollarSign, FileText, Landmark, Trash2 } from "lucide-react";
import { useDeleteVerificationPayment } from "@/shared/hooks/use-delete-verification-payment";
import { ConfirmModal } from "@/shared/components/modals/confirm-modal";

interface Props {
  isOpen: boolean;
  invoiceId?: number | string | null;
  invoiceTag?: string | null;
  onClose: () => void;
}

function DeleteButton({
  paymentId,
  onDelete,
  isDeleting,
}: {
  paymentId: number | string;
  onDelete: (id: number | string) => void | Promise<void>;
  isDeleting: boolean;
}) {
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onDelete(paymentId);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isDeleting}
      className="mt-2 inline-flex items-center gap-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded disabled:opacity-50"
    >
      <Trash2 className="w-4 h-4" /> {isDeleting ? "Eliminando..." : "Eliminar"}
    </button>
  );
}

export function VerificationPaymentsModal({
  isOpen,
  invoiceId,
  onClose,
}: Props) {
  const { data, isLoading, error, refetch } = useVerificationPayments(
    invoiceId ?? undefined
  );

  const { deletePayment, isDeleting } = useDeleteVerificationPayment();
  const { selectedContract, setInvoicesResult } = useClientStore();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<number | string | null>(null);

  const handleDelete = (id: number | string) => {
    // open confirmation modal
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const performDelete = async () => {
    const id = pendingDeleteId;
    if (!id) return;
    try {
      await deletePayment(id);
      // Refetch verification payments list
      await refetch();

      // Additionally refresh invoices via clientService and update store
      try {
        if (selectedContract) {
          const invoices = await clientService.getInvoices(selectedContract.id);
          setInvoicesResult(invoices);
        }
      } catch (err) {
        // Non-fatal: keep going even if invoices refresh fails
        console.error("Error reloading invoices after delete:", err);
      }

      // Refresh server-side data and close modal
      router.refresh();
      onClose();
    } catch (err) {
      console.error(err);
      // keep modal open so ConfirmModal shows feedback via its own loading state; here just log
    } finally {
      setConfirmOpen(false);
      setPendingDeleteId(null);
    }
  };

  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Pagos en verificación"
    >
      <div className="relative w-full max-w-xl max-h-[80vh] overflow-auto rounded-xl shadow-xl bg-white border">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-lg">Pagos en verificación</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              className="text-xs px-2 py-1 bg-gray-100 rounded-md"
            >
              Actualizar
            </button>
            <button
              aria-label="Cerrar"
              onClick={onClose}
              className="text-sm px-3 py-1 bg-gray-100 rounded-md"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="p-4">
          {isLoading && <p className="text-sm text-gray-600">Cargando...</p>}

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700">
              <AlertCircle /> <div>{error}</div>
            </div>
          )}

          {!isLoading && !error && data && data.results.length === 0 && (
            <p className="text-sm text-gray-600">No hay pagos en verificación.</p>
          )}

          {!isLoading && data && data.results.length > 0 && (
            <div className="space-y-3">
              {/* Información introductoria */}
           

              <div className="max-h-[50vh] overflow-auto space-y-3 pr-2">
                   <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    Se muestran los pagos en verificación que has reportado. Si detectas algún error, puedes eliminar el pago y reportarlo de nuevo.
                  </div>
                </div>
              </div>
                {data.results.map((p) => {
                          const d = p.data as VerificationPaymentData | null;
                          console.log(d)
                          const amount = d?.metadata?.amount;
                          const displayAmount = amount
                            ? `Bs. ${parseFloat(String(amount)).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : null;

                          return (
                            <div key={p.id} className="p-3 border rounded-md bg-gray-50">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                               
                                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="flex items-center gap-2 text-xs text-gray-700">
                                      <DollarSign className="w-4 h-4 text-gray-500" />
                                      <div>
                                        <div className="font-medium text-xs">Monto</div>
                                        <div className="text-xs text-gray-600">{displayAmount ?? "-"}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-700">
                                      <CreditCard className="w-4 h-4 text-gray-500" />
                                      <div>
                                        <div className="font-medium text-xs">Método</div>
                                        <div className="text-xs text-gray-600">{d?.payment_method ?? "-"}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-700">
                                      <Landmark className="w-4 h-4 text-gray-500" />
                                      <div>
                                        <div className="font-medium text-xs">Banco origen</div>
                                        <div className="text-xs text-gray-600">{d?.metadata?.bank_origin ?? "-"}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-700">
                                      <Landmark className="w-4 h-4 text-gray-500" />
                                      <div>
                                        <div className="font-medium text-xs">Banco asociado</div>
                                        <div className="text-xs text-gray-600">{d?.bank_associated ?? "-"}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-700">
                                      <Landmark className="w-4 h-4 text-gray-500" />
                                      <div>
                                        <div className="font-medium text-xs">Cuenta</div>
                                        <div className="text-xs text-gray-600">{d?.account_number_associated ?? "-"}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-700">
                                      <User className="w-4 h-4 text-gray-500" />
                                      <div>
                                        <div className="font-medium text-xs">Cliente</div>
                                        <div className="text-xs text-gray-600">{d?.client ?? "-"}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-700">
                                      <Phone className="w-4 h-4 text-gray-500" />
                                      <div>
                                        <div className="font-medium text-xs">Teléfono</div>
                                        <div className="text-xs text-gray-600">{d?.client_phone ?? "-"}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-700">
                                      <Mail className="w-4 h-4 text-gray-500" />
                                      <div>
                                        <div className="font-medium text-xs">Email</div>
                                        <div className="text-xs text-gray-600">{d?.client_email ?? "-"}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-700">
                                      <FileText className="w-4 h-4 text-gray-500" />
                                      <div>
                                        <div className="font-medium text-xs">Factura</div>
                                        <div className="text-xs text-gray-600">{d?.invoice_id ? `#${d.invoice_id}` : "-"}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-blue-700">
                                      <AlertCircle className="w-4 h-4" />
                                      <div>
                                        <div className="text-xs">{p.event_type_name || d?.event_type_name || "-"}</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right text-xs text-gray-600">
                                  <div>Intentos: {p.attempt_count}</div>
                                  <div className="mt-1">{new Date(p.created_at).toLocaleString()}</div>
                                              {/* {invoiceTag === "incomplet_payment" && (
                                                <DeleteButton paymentId={p.id} onDelete={handleDelete} isDeleting={isDeleting} />
                                              )} */}
                                                {p.event_type === "not_found" && (
                                                <DeleteButton paymentId={p.id} onDelete={handleDelete} isDeleting={isDeleting} />
                                              )}
                                                {/* <DeleteButton paymentId={p.id} onDelete={handleDelete} isDeleting={isDeleting} /> */}

                                </div>
                              </div>
                              {p.observation && (
                                <div className="text-xs text-gray-700 mt-2">Observación: {p.observation}</div>
                              )}
                            </div>
                          );
                })}
              </div>
            </div>
          )}
          <ConfirmModal
            open={confirmOpen}
            onClose={() => {
              setConfirmOpen(false);
              setPendingDeleteId(null);
            }}
            onConfirm={performDelete}
            message={"¿Eliminar este pago en verificación? Esta acción no se puede deshacer."}
            confirmLabel={isDeleting ? "Eliminando..." : "Sí, eliminar"}
            cancelLabel="Cancelar"
          />
        </div>
      </div>
    </div>
  );
}

export default VerificationPaymentsModal;
