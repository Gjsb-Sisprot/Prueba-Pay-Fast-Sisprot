"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { CheckCircle, AlertCircle, LoaderCircleIcon } from "lucide-react";
import AffiliationPaymentDetails, { PaymentDataShape } from "./affiliation-payment-details";
import { useAffiliateMethod } from "@/modules/methods/hooks/use-affiliated";

// Local payload type for affiliating a payment method (POST /api/methods/affiliate)
type AffiliatePayload = {
  client: number;
  method: number;
  sender: string;
  name?: string;
  bank?: number | null;
  identification?: string | null;
};
import { useClientStore } from "@/shared/lib/store/client-store";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SelectNative } from "@/shared/components/ui/select-native";
import { useBanks } from "@/shared/hooks/use-banks";
import { usePaymentFormStore } from "@/shared/lib/store/payment-form-store";
import type { PaymentFormValues } from "@/shared/lib/store/payment-form-store";
import type { PaymentNationalFormValues } from "@/shared/lib/validation/payments-national-schema";
import type { PagoMovilValues } from "@/shared/lib/validation/afiliation";

interface PaymentAfiliationModalProps {
  open: boolean;
  onClose: () => void;
  client?: string | number;
}

export function PaymentAfiliationModal({ open, onClose, client }: PaymentAfiliationModalProps) {
  const { affiliateMethod, loading, successMessage, errorMessage, resetMessages } = useAffiliateMethod();
  const { paymentApiData, setPaymentApiData } = useClientStore();

  const clientId = client ? parseInt(client.toString(), 10) : 0;

  const [alias, setAlias] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [cedula, setCedula] = useState<string>("");
  const [documentType, setDocumentType] = useState<string>("");
  const [selectedBankId, setSelectedBankId] = useState<number | undefined>(undefined);

  const { banks: apiBanks, loading: banksLoading, error: banksError } = useBanks();

  const { formValues } = usePaymentFormStore();
  console.log("AffiliationPaymentDetails formValues:", formValues);
  // Prefill cedula and selected bank from formValues when available (typed)
  const isPaymentNational = (v: PaymentFormValues | null): v is PaymentNationalFormValues => {
    return !!v && typeof v === "object" && "selectedBank" in v;
  };


  useEffect(() => {
    if (!formValues) return;

    if (isPaymentNational(formValues)) {
      const maybeSelectedBank = formValues.selectedBank;
      if (maybeSelectedBank && typeof maybeSelectedBank === "object") {
        if (typeof maybeSelectedBank.id === "number") {
          setSelectedBankId(maybeSelectedBank.id);
        } else if (maybeSelectedBank.code && apiBanks && apiBanks.length) {
          const match = apiBanks.find((b) => b.code === maybeSelectedBank.code || b.name === maybeSelectedBank.name);
          if (match) setSelectedBankId(match.id);
        }
      }
    }

    if (formValues && typeof formValues === "object" && "documentNumber" in (formValues as object)) {
      const fm = formValues as unknown as PagoMovilValues;
      const maybeDocument = fm.documentNumber ?? "";
      if (typeof maybeDocument === "string" && maybeDocument.trim() !== "") {
        setCedula(maybeDocument);
      }
      if (fm.documentType && typeof fm.documentType === "string") {
        setDocumentType(fm.documentType);
      }
    }
  }, [formValues, apiBanks]);

  // Close the modal after success (hook provides successMessage)
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        resetMessages();
        onClose();
        // clear saved payment API data when modal closes after success
        setPaymentApiData(null);
        setAlias("");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, onClose, resetMessages, setPaymentApiData]);

  // If modal closed manually, clear stored payment API data and reset messages
  useEffect(() => {
    if (!open) {
      resetMessages();
      setAlias("");
      // don't clear paymentApiData here to allow other flows to inspect it if needed
    }
  }, [open, resetMessages]);


  // Normalize/parse the incoming payment API payload without using `any`.
  let paymentData: PaymentDataShape | null = null;
  let apiMessage: string | null = null;

  // Helper function to safely get payment data from an object
  const extractPaymentData = (obj: Record<string, unknown>): PaymentDataShape | null => {
    const pd = obj.payment_data as Record<string, unknown>;
    if (pd && typeof pd === "object") {
      return {
        sender: typeof pd.sender === "string" ? pd.sender : undefined,
        sender_affiliated: typeof pd.sender_affiliated === "boolean" ? pd.sender_affiliated : undefined,
        method: typeof pd.method === "number" ? pd.method : undefined,
        method_name: typeof pd.method_name === "string" ? pd.method_name : undefined,
      };
    }
    return null;
  };

  if (paymentApiData) {
    // Case 1: Directly structured response
    if (typeof paymentApiData === "object" && paymentApiData.payment_data) {
      paymentData = extractPaymentData(paymentApiData);
      apiMessage = typeof paymentApiData.message === "string" ? paymentApiData.message : null;
    }

    // Case 2: Nested under data property
    if (!paymentData && typeof paymentApiData === "object" && paymentApiData.data) {
      const dataObj = paymentApiData.data as Record<string, unknown>;
      if (dataObj && typeof dataObj === "object") {
        paymentData = extractPaymentData(dataObj);
        if (!apiMessage && typeof dataObj.message === "string") {
          apiMessage = dataObj.message;
        }
      }
    }
  }

  const hasRequiredPaymentInfo = Boolean(paymentData?.method !== undefined && paymentData?.sender && alias.trim() !== "");
  const alreadyAffiliated = paymentData?.sender_affiliated === true;


  const handleSubmit = async () => {
    resetMessages();
    setLocalError(null);
    try {
      // Prefer payment API data when available
      const pd = paymentData;
      const methodNumber = pd?.method ?? undefined;
      const sender = pd?.sender ?? undefined;

      // Validate required values before calling the affiliate hook
      if (!methodNumber || !sender) {
        setLocalError("Información de pago incompleta: falta método o remitente.");
        return;
      }

      // Only include bank and identification when the method is NOT Zelle (3)
      const payload: AffiliatePayload = {
        client: clientId,
        method: methodNumber as number,
        sender: sender as string,
        name: alias,
      };

      if (methodNumber !== 3) {
        payload.bank = selectedBankId ?? null;
        // Compose identification as documentType + documentNumber when available (same format used elsewhere)
        const docNum = cedula && cedula.trim() !== "" ? cedula.trim() : null;
        payload.identification = docNum ? `${documentType ?? ""}${docNum}` : null;
      } else {
        // For Zelle, explicitly send nulls for bank and identification
        payload.bank = null;
        payload.identification = null;
      }

      await affiliateMethod(payload);
    } catch (err) {
      console.error("Error al afiliar método:", err);
    }
  };



  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Afiliar método</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {paymentData ? (
            <>
              <AffiliationPaymentDetails paymentData={paymentData} apiMessage={apiMessage} />

              {/* Show bank selector and cedula only when method is not Zelle (3) */}
              {paymentData?.method !== 3 && (
                <>
                  <div>
                    <label className="text-sm text-muted-foreground">Banco</label>
                    <SelectNative
                      value={selectedBankId?.toString() ?? ""}
                      onChange={(e) => setSelectedBankId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      className="mt-1"
                      disabled={banksLoading || !!banksError}
                    >
                      <option value="">Seleccione un banco</option>
                      {banksLoading && <option value="">Cargando bancos...</option>}
                      {apiBanks && apiBanks.map((b) => (
                        <option key={b.id} value={b.id}>{`${b.code} - ${b.name}`}</option>
                      ))}
                    </SelectNative>
                    {banksError && <div className="text-xs text-red-600 mt-1">No se pudieron cargar los bancos</div>}
                  </div>

                  <div className="flex gap-3">
                    <div className="sm:w-40">
                      <Label htmlFor="documentType">Tipo de documento</Label>
                      <SelectNative id="documentType" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                        <option value="">Seleccionar</option>
                        <option value="V">V</option>
                        <option value="E">E</option>
                        <option value="J">J</option>
                        <option value="G">G</option>
                        <option value="P">P</option>
                      </SelectNative>
                    </div>

                    <div className="flex-1">
                      <Label htmlFor="documentNumber">Número de documento</Label>
                      <Input
                        id="documentNumber"
                        placeholder="Número de documento"
                        maxLength={9}
                        value={cedula}
                        onChange={(e) => setCedula(e.target.value)}
                        onInput={(e: React.FormEvent<HTMLInputElement>) => {
                          const el = e.currentTarget;
                          el.value = el.value.replace(/\D/g, "").slice(0, 9);
                          setCedula(el.value);
                        }}
                        className="text-[16px] mt-1"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-sm text-muted-foreground">Alias (nombre para identificar este método)</label>

                <Input id="alias" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Ej: Mi cuenta bancaria" className="mt-1 text-[16px]" />
              </div>

              {alreadyAffiliated && (
                <div className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 p-2 rounded">
                  Este remitente ya aparece como afiliado. Puedes actualizar el alias si lo deseas.
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-600">No se encontró información automática del pago. Puedes ingresar los datos manualmente desde la sección de afilación.</div>
          )}

          {successMessage && (
            <Alert className="border-green-500/40 bg-green-50 text-green-700">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertTitle>Éxito</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert className="border-red-500/40 bg-red-50 text-red-700">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {localError && (
            <Alert className="border-red-500/40 bg-red-50 text-red-700">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{localError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              setPaymentApiData(null);
              setAlias("");
              setLocalError(null);
            }}
            className="sm:w-auto w-full text-red-700 border-red-700"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !hasRequiredPaymentInfo}
          >
            {loading ? (
              <>
                <LoaderCircleIcon className="animate-spin" size={16} /> Afiliando Pago...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" /> {alreadyAffiliated ? "Actualizar alias" : "Afiliar"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
