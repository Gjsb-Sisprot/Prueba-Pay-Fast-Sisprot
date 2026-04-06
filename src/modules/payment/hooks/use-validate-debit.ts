import { useCallback, useState } from "react";
import { validateOtp as apiValidateOtp } from "../../../shared/lib/api/debit";
import type { DebitInvoice } from "../../../shared/types/debit";

type UseValidateDebitReturn<T> = {
  loading: boolean;
  error: Error | null;
  data: T | null;
  validateOtp: (payload: DebitInvoice) => Promise<T>;
};

export function useValidateDebit<T = unknown>(): UseValidateDebitReturn<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const validateOtp = useCallback(async (payload: DebitInvoice) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiValidateOtp<T>(payload);
      setData(result);
      return result;
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, data, validateOtp };
}

export default useValidateDebit;
