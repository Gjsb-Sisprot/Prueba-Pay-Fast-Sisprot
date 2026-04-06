"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { DialogFooter } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { CheckCircle, AlertCircle, LoaderCircleIcon } from "lucide-react";
import { SelectNative } from "@/shared/components/ui/select-native";

import {
  PagoMovilValues,
  TransferenciaValues,
  ZelleValues,
  pagoMovilSchema,
  transferenciaSchema,
  zelleSchema,
  PaymentMethod as MethodKey,
} from "@/shared/lib/validation/afiliation";

import { AfiliationFormPagoMovil } from "../methods-afiliation-forms/afiliation-pm";
import { AfiliationFormTransferencia } from "../methods-afiliation-forms/afiliation-trf";
import { AfiliationFormZelle } from "../methods-afiliation-forms/afiliation-zelle";
import { useAffiliateMethod } from "@/modules/methods/hooks/use-affiliated";
import { updateAffiliateMethod } from "@/shared/lib/api/methods";
import { PaymentMethod as PaymentMethodItem } from "@/shared/types/affiliated-methods";
import type { Bank } from "@/shared/types/banks-data";
import { useBanks } from "@/shared/hooks/use-banks";

interface AffiliationManualFormProps {
  clientId: number;
  editingMethod?: PaymentMethodItem;
  reloadMethods: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

const METHOD_OPTIONS = [
  { value: "pago-movil", label: "Pago Móvil" },
  { value: "transferencia", label: "Transferencia Bancaria" },
  { value: "zelle", label: "Zelle" },
];

const DEFAULT_METHOD: MethodKey = "pago-movil";

export function AffiliationManualForm({ clientId, editingMethod, reloadMethods, onClose, onSuccess, onError }: AffiliationManualFormProps) {
  const [selectedMethod, setSelectedMethod] = useState<MethodKey>(DEFAULT_METHOD);

  const { affiliateMethod, loading, successMessage, errorMessage, resetMessages } = useAffiliateMethod();

  // banks list (used to try to map bank_data -> real bank entry including id)
  const { banks: apiBanks } = useBanks();

  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  // forms
  const formPm = useForm<PagoMovilValues>({ resolver: zodResolver(pagoMovilSchema), defaultValues: { cod: "0412", phone: "", name: "" } });
  const formTrf = useForm<TransferenciaValues>({ resolver: zodResolver(transferenciaSchema), defaultValues: { account: "", name: "" } });
  const formZelle = useForm<ZelleValues>({ resolver: zodResolver(zelleSchema), defaultValues: { holder: "", name: "" } });

  useEffect(() => {
    // keep internal messages in sync with hook
    if (successMessage) {
      setLocalSuccess(successMessage);
      onSuccess(successMessage);
      resetMessages();
    }
    if (errorMessage) {
      setLocalError(errorMessage);
      onError(errorMessage);
      resetMessages();
    }
  }, [successMessage, errorMessage, onSuccess, onError, resetMessages]);

  useEffect(() => {
    if (editingMethod) {
      const m = editingMethod.method;
      if (m === 1) {
        setSelectedMethod("pago-movil");
        const sender = editingMethod.sender || "";
        const cod = sender.slice(0, 4) || "0412";
        const phone = sender.slice(4) || "";
        // parse identification_display into type + number if available
        const parseIdentification = (display?: string) => {
          if (!display) return { documentType: "", documentNumber: "" };
          const trimmed = display.trim();
          const first = trimmed.charAt(0).toUpperCase();
          const rest = trimmed.slice(1).replace(/\D/g, "");
          const validTypes = ["V", "E", "J", "G", "P"];
          return validTypes.includes(first) ? { documentType: first, documentNumber: rest } : { documentType: "", documentNumber: trimmed.replace(/\D/g, "") };
        };

        const parseBank = (bankData?: unknown) => {
          if (!bankData) return null;
          // If backend already provided a structured bank object, accept it
          if (typeof bankData === "object" && bankData !== null) {
            const b = bankData as Record<string, unknown>;
            const code = typeof b.code === "string" ? b.code.trim() : undefined;
            const name = typeof b.name === "string" ? b.name.trim() : undefined;
            const id = typeof b.id === "number" ? b.id : undefined;
            if (code || name) return { ...(code ? { code } : {}), ...(name ? { name } : {}), ...(id ? { id } : {}) } as { code?: string; name?: string; id?: number };
            return null;
          }

          // expected formats: "CODE - Name" or just "Name" as string
          const s = String(bankData);
          const parts = s.split(" - ");
          if (parts.length >= 2) return { code: parts[0].trim(), name: parts.slice(1).join(" - ").trim() };
          const only = parts[0].trim();
          return { code: only, name: only };
        };

        const idParts = parseIdentification(editingMethod.identification_display || editingMethod.identification_display);
        formPm.reset({ cod, phone, name: editingMethod.name || "", documentType: idParts.documentType, documentNumber: idParts.documentNumber });
        const bankObj = parseBank(editingMethod.bank_data);
        if (bankObj) {
          // try to map to an API bank (so we keep id when available)
          const matched = apiBanks?.find((b: Bank) => b.code === bankObj.code || b.name === bankObj.name);
          formPm.setValue("selectedBank", (matched ?? bankObj) as PagoMovilValues["selectedBank"], { shouldValidate: true });
        }
      } else if (m === 4) {
        setSelectedMethod("transferencia");
        const parseIdentification = (display?: string) => {
          if (!display) return { documentType: "", documentNumber: "" };
          const trimmed = display.trim();
          const first = trimmed.charAt(0).toUpperCase();
          const rest = trimmed.slice(1).replace(/\D/g, "");
          const validTypes = ["V", "E", "J", "G", "P"];
          return validTypes.includes(first) ? { documentType: first, documentNumber: rest } : { documentType: "", documentNumber: trimmed.replace(/\D/g, "") };
        };

        const parseBank = (bankData?: unknown) => {
          if (!bankData) return null;
          if (typeof bankData === "object" && bankData !== null) {
            const b = bankData as Record<string, unknown>;
            const code = typeof b.code === "string" ? b.code.trim() : undefined;
            const name = typeof b.name === "string" ? b.name.trim() : undefined;
            const id = typeof b.id === "number" ? b.id : undefined;
            if (code || name) return { ...(code ? { code } : {}), ...(name ? { name } : {}), ...(id ? { id } : {}) } as { code?: string; name?: string; id?: number };
            return null;
          }
          const s = String(bankData);
          const parts = s.split(" - ");
          if (parts.length >= 2) return { code: parts[0].trim(), name: parts.slice(1).join(" - ").trim() };
          const only = parts[0].trim();
          return { code: only, name: only };
        };

        const idParts = parseIdentification(editingMethod.identification_display || editingMethod.identification_display);
        formTrf.reset({ account: editingMethod.sender || "", name: editingMethod.name || "", documentType: idParts.documentType, documentNumber: idParts.documentNumber });
        const bankObj = parseBank(editingMethod.bank_data);
        if (bankObj) {
          const matched = apiBanks?.find((b: Bank) => b.code === bankObj.code || b.name === bankObj.name);
          formTrf.setValue("selectedBank", (matched ?? bankObj) as TransferenciaValues["selectedBank"], { shouldValidate: true });
        }
      } else if (m === 3) {
        setSelectedMethod("zelle");
        formZelle.reset({ holder: editingMethod.sender || "", name: editingMethod.name || "" });
      } else {
        setSelectedMethod(DEFAULT_METHOD);
      }
    } else {
      setSelectedMethod(DEFAULT_METHOD);
      formPm.reset();
      formTrf.reset();
      formZelle.reset();
    }
  }, [editingMethod, formPm, formTrf, formZelle, apiBanks]);

  const handleSubmit = async () => {
    resetMessages();
    try {
      // type guard to safely extract bank id without using `any`
      const getBankId = (b: unknown): number | undefined => {
        if (!b || typeof b !== "object") return undefined;
        const obj = b as Record<string, unknown>;
        if ("id" in obj && typeof obj.id === "number") return obj.id as number;
        return undefined;
      };

      if (selectedMethod === "pago-movil") {
        await formPm.handleSubmit(async (values) => {
          const payload = {
            client: clientId,
            method: 1,
            sender: `${values.cod}${values.phone}`,
            name: values.name,
            identification: `${values.documentType}${values.documentNumber}`,
            bank: getBankId(values.selectedBank) ?? 1,
          } as {
            client: number;
            method: number;
            sender: string;
            name: string;
            identification: string;
            bank?: number;
          };
          if (editingMethod) {
            setLocalLoading(true);
            try {
              const res = await updateAffiliateMethod(editingMethod.id, { name: payload.name, sender: payload.sender, method: payload.method, bank: payload.bank, identification: payload.identification });
              setLocalSuccess(res.message || "Actualizado");
              onSuccess(res.message || "Actualizado");
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              setLocalError(msg || "Error al actualizar");
              onError(msg || "Error al actualizar");
            } finally {
              setLocalLoading(false);
            }
          } else {
            await affiliateMethod(payload);
          }

          await reloadMethods();
        })();
      } else if (selectedMethod === "transferencia") {
        await formTrf.handleSubmit(async (values) => {
          const payload = {
            client: clientId,
            method: 4,
            sender: values.account.replace(/-/g, ""),
            name: values.name,
            identification: `${values.documentType}${values.documentNumber}`,
            bank: getBankId(values.selectedBank) ?? 1,
          } as {
            client: number;
            method: number;
            sender: string;
            name: string;
            identification: string;
            bank?: number;
          };
          if (editingMethod) {
            setLocalLoading(true);
            try {
              const res = await updateAffiliateMethod(editingMethod.id, { name: payload.name, sender: payload.sender, method: payload.method, bank: payload.bank, identification: payload.identification });
              setLocalSuccess(res.message || "Actualizado");
              onSuccess(res.message || "Actualizado");
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              setLocalError(msg || "Error al actualizar");
              onError(msg || "Error al actualizar");
            } finally {
              setLocalLoading(false);
            }
          } else {
            await affiliateMethod(payload);
          }

          await reloadMethods();
        })();
      } else if (selectedMethod === "zelle") {
        await formZelle.handleSubmit(async (values) => {
          const payload = { client: clientId, method: 3, sender: values.holder, name: values.name, identification: null, bank: null };
          if (editingMethod) {
            setLocalLoading(true);
            try {
              const res = await updateAffiliateMethod(editingMethod.id, { name: payload.name, sender: payload.sender, method: payload.method });
              setLocalSuccess(res.message || "Actualizado");
              onSuccess(res.message || "Actualizado");
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              setLocalError(msg || "Error al actualizar");
              onError(msg || "Error al actualizar");
            } finally {
              setLocalLoading(false);
            }
          } else {
            await affiliateMethod(payload);
          }

          await reloadMethods();
        })();
      }
    } catch (err) {
      // errors handled above
      console.error("Error al afiliar método:", err);
    }
  };

  const isButtonDisabled = (loading || localLoading) || (
    !(successMessage || localSuccess) && (
      selectedMethod === "pago-movil" ? !formPm.formState.isValid :
        selectedMethod === "transferencia" ? !formTrf.formState.isValid :
          selectedMethod === "zelle" ? !formZelle.formState.isValid :
            true
    )
  );

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="method-select" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Selecciona el tipo de método a afiliar</label>
          <SelectNative id="method-select" value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value as MethodKey)} disabled={loading || localLoading} className="mt-2">
            {METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectNative>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={selectedMethod} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {selectedMethod === "pago-movil" && <AfiliationFormPagoMovil form={formPm} />}
            {selectedMethod === "transferencia" && <AfiliationFormTransferencia form={formTrf} />}
            {selectedMethod === "zelle" && <AfiliationFormZelle form={formZelle} />}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {(successMessage || localSuccess) && (
            <motion.div key="success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <Alert className="border-green-500/40 bg-green-50 text-green-700">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertTitle>Éxito</AlertTitle>
                <AlertDescription>{successMessage || localSuccess}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {(errorMessage || localError) && (
            <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <Alert className="border-red-500/40 bg-red-50 text-red-700">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMessage || localError}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            // Reset messages and close the modal
            resetMessages();
            setLocalError(null);
            setLocalSuccess(null);
            onClose();
          }}
          className="sm:w-auto w-full text-red-700 border-red-700"
          disabled={loading || localLoading}
        >
          Cancelar
        </Button>
  <Button type="button" onClick={handleSubmit} disabled={isButtonDisabled} className="mb-6 sm:mb-0">
          {(loading || localLoading) ? (
            <>
              <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
              {editingMethod ? "Actualizando..." : "Procesando..."}
            </>
          ) : (
            <>{editingMethod ? "Guardar" : "Afiliar"}</>
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
