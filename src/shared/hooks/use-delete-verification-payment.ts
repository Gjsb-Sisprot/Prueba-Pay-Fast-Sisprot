"use client";

import { useState, useCallback } from "react";
import { deleteVerificationPayment as apiDeleteVerificationPayment } from "@/shared/lib/api/verification-payments";

export function useDeleteVerificationPayment() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const deletePayment = useCallback(async (id: number | string) => {
    setIsDeleting(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await apiDeleteVerificationPayment(id);
      setSuccess(true);
      return res;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err ?? "Error al eliminar el pago");
      setError(message);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deletePayment, isDeleting, error, success } as const;
}

export default useDeleteVerificationPayment;
