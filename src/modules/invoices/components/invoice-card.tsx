"use client";

import React from "react";
import { CheckCircle, AlertCircle, Calendar, FileText } from "lucide-react";
import { type Invoice } from "@/shared/lib/api-client";
import DebitImmediateModal from "./debit-immediate-modal";

type ExpirationInfo = { text: string; className: string };

type Props = {
  invoice: Invoice;
  index: number;
  selectedInvoice: Invoice | null;
  invoicesResultCount: number;
  availableInvoiceId: number | null | undefined;
  onSelect: (id: number) => void;
  onOpenVerificationModal: (id: number, tag?: string | null) => void;
  formatDate: (s: string) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatPeriod: (m: number, y: number) => string;
  isInvoiceExpired: (s: string) => boolean;
  getExpirationText: (s: string) => ExpirationInfo;
  getDaysOverdue: (s: string) => number;
};

export default function InvoiceCard({
  invoice,
  index,
  selectedInvoice,
  invoicesResultCount,
  availableInvoiceId,
  onSelect,
  onOpenVerificationModal,
  formatDate,
  formatCurrency,
  formatPeriod,
  isInvoiceExpired,
  getExpirationText,
  getDaysOverdue,
}: Props) {
  const [debitModalOpen, setDebitModalOpen] = React.useState(false);

  const isUnderVerification =
    (invoice.payment_validation_log?.not_found ?? 0) > 0;

  const rawAmount = invoice.debt_with_payment_pending?.amount_bs;
  const pendingAmount =
    rawAmount == null ? 0 : Number(String(rawAmount).replace(",", "."));
  const hasPendingDebt = pendingAmount > 0;
  const hasZeroPendingDebt =
    pendingAmount === 0 && rawAmount !== undefined && rawAmount !== null;

  const isSelected = selectedInvoice?.id === invoice.id;

  const hasPendingDebitImmediate = (
    invoice.debit_inmediate_payment_info ?? []
  ).some(
    (d) =>
      String(d.status ?? "").toLowerCase() === "pending" ||
      String(d.status ?? "").toLowerCase() === "pend",
  );

  const isAvailable = !hasPendingDebitImmediate
    ? (invoicesResultCount ?? 0) > 1
      ? invoice.id === availableInvoiceId && !hasZeroPendingDebt
      : hasPendingDebt ||
        (invoice.id === availableInvoiceId && !hasZeroPendingDebt)
    : false;

  const isExpired = isInvoiceExpired(invoice.date_expiration);
  const expirationInfo = getExpirationText(invoice.date_expiration);

  const cardVisualClass = hasPendingDebitImmediate
    ? "border-gray-200 bg-white shadow-sm cursor-not-allowed"
    : hasZeroPendingDebt
      ? "border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-200"
      : isSelected
        ? isExpired
          ? "border-red-500 bg-red-50 shadow-md ring-1 ring-red-200"
          : "border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-200"
        : isAvailable
          ? "border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer"
          : "border-gray-200 bg-gray-50 opacity-60";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isAvailable && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onSelect(invoice.id);
    }
  };

  const getInvoiceConcept = (invoice: Invoice) => {
    if (invoice.invoice_items_gsoft && invoice.invoice_items_gsoft.length > 0) {
      const items = invoice.invoice_items_gsoft;
      if (items.length === 1) {
        return {
          serviceName: items[0].service_name,
          details: items[0].details,
        };
      } else {
        const services = items
          .map((item) => item.service_name)
          .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
        return {
          serviceName: services.join(", "),
          details: `${items.length} servicios incluidos`,
        };
      }
    }
    return {
      serviceName: "No especificado",
      details: "Información no disponible",
    };
  };

  const concept = getInvoiceConcept(invoice);

  return (
    <div
      className={`relative p-3 sm:p-4 border rounded-lg transition-all duration-200 ${cardVisualClass}`}
      onClick={() => isAvailable && onSelect(invoice.id)}
      role={isAvailable ? "button" : undefined}
      tabIndex={isAvailable ? 0 : -1}
      onKeyDown={handleKeyDown}
      aria-label={
        isAvailable
          ? `Seleccionar nota de cobro ${invoice.id}`
          : `Nota de cobro ${invoice.id} no disponible`
      }
      aria-disabled={hasPendingDebitImmediate}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-row xs:items-start xs:justify-between gap-2">
          <div className="flex-shrink-0 self-start xs:self-center">
            <div
              className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                        ${
                          isSelected
                            ? isExpired
                              ? "bg-red-500 border-red-500"
                              : "bg-blue-500 border-blue-500"
                            : isAvailable
                              ? "border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                              : "border-gray-200 bg-gray-100"
                        }
                      `}
              aria-hidden="true"
            >
              {isSelected && <div className="w-3 h-3 bg-white rounded-full" />}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full">
            <div className="flex items-center gap-2">
              <h4 className="font-black text-gray-900 text-base sm:text-lg">
                NC #{invoice.id}
              </h4>
                {hasPendingDebt && (
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full whitespace-nowrap font-semibold">
                      No pagada
                    </span>
                  )}
              {invoice.tag === "incomplet_payment" && (
                <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full whitespace-nowrap font-semibold">
                  Pago incompleto
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1 ml-2">
              
              {invoice.debit_inmediate_payment_info &&
              invoice.debit_inmediate_payment_info.length > 0 ? (
                // If there are debit-immediate records, only show the debit immediate badge/button here
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  {hasPendingDebitImmediate ? (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full whitespace-nowrap font-semibold">
                      Pago en verificación
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full whitespace-nowrap font-medium">
                      Débito inmediato (
                      {invoice.debit_inmediate_payment_info.length})
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDebitModalOpen(true);
                    }}
                    className="w-full sm:w-auto text-xs px-2 py-0.5 bg-black text-white rounded-full whitespace-nowrap font-semibold sm:ml-2 text-center"
                  >
                    Ver pagos débito inmediato
                  </button>
                </div>
              ) : isUnderVerification || invoice.tag === "incomplet_payment" ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  
                  {invoice.has_active_agreement &&
                    invoice.agreement_expiration_at !== null && (
                      <>
                        <span className="flex items-center text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full whitespace-nowrap font-semibold">
                          <CheckCircle className="w-3 h-3 mr-1" /> Convenio
                          Activo
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-black text-white rounded-full whitespace-nowrap sm:ml-2">
                          Venc. convenio:{" "}
                          {formatDate(invoice.agreement_expiration_at || "")}
                        </span>
                      </>
                    )}
                  {/* Button to open verification payments modal (previous behavior) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenVerificationModal(invoice.id, invoice.tag ?? null);
                    }}
                    className="w-full sm:w-auto text-xs px-2 py-0.5 bg-gray-800 text-white rounded-full whitespace-nowrap font-semibold sm:ml-2 text-center"
                  >
                    Ver pagos incompletos
                  </button>
                
                </div>
              ) : (
                <>
                  {index === 0 && (
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full whitespace-nowrap font-medium">
                      Próxima a pagar
                    </span>
                  )}
                  {index > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full whitespace-nowrap">
                      Bloqueada
                    </span>
                  )}
              
                </>
              )}
            </div>
          </div>
        </div>

        <DebitImmediateModal
          isOpen={debitModalOpen}
          items={invoice.debit_inmediate_payment_info ?? []}
          onClose={() => setDebitModalOpen(false)}
        />

        <div className="p-3 bg-gray-50 rounded-md">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-700 mb-1 break-words">
                {concept.serviceName}
              </p>
              <p className="text-xs text-gray-600 leading-relaxed break-words">
                {concept.details}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="font-medium text-gray-600 min-w-0">
                Emisión:
              </span>
              <span className="text-gray-800 break-all">
                {formatDate(invoice.date_emission)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="font-medium text-gray-600 min-w-0">
                Vencimiento:
              </span>
              <div className="flex flex-col xs:flex-row xs:items-center xs:gap-2 min-w-0">
                <span className="text-gray-800 break-all">
                  {formatDate(invoice.date_expiration)}{" "}
                  {getDaysOverdue(invoice.date_expiration) > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full whitespace-nowrap font-semibold">
                      Pago atrasado
                    </span>
                  )}
                </span>
                <span
                  className={`text-xs whitespace-nowrap ${expirationInfo.className}`}
                >
                  ({expirationInfo.text})
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-600 min-w-0">
                Período:
              </span>
              <span className="text-gray-800 font-medium">
                {formatPeriod(invoice.month, invoice.year)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600 min-w-0">Deuda:</span>
              <span className="text-red-700 font-bold text-lg">
                {formatCurrency(
                  invoice.debt_with_payment_pending
                    ? Number(
                        String(
                          invoice.debt_with_payment_pending.amount_bs,
                        ).replace(",", "."),
                      )
                    : parseFloat(invoice.debt_bs || "0"),
                  "Bs.",
                )}
              </span>
            </div>
          </div>
        </div>

        {!isAvailable && (
          <div className="mt-3 p-3 bg-gray-100 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600 leading-relaxed">
                Debes pagar las notas de cobro en orden de vencimiento
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
