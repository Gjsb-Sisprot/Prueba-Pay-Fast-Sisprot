import { useCallback, useState } from "react";
import { getOtpCode } from "../../../shared/lib/api/debit";
import type { DebitInvoice } from "../../../shared/types/debit";

type UseDebitReturn<T> = {
  loading: boolean;
  error: Error | null;
  data: T | null;
  requestOtp: (payload: DebitInvoice) => Promise<T>;
};

export function useDebit<T = unknown>(): UseDebitReturn<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const requestOtp = useCallback(async (payload: DebitInvoice) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getOtpCode<T>(payload);
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

  return { loading, error, data, requestOtp };
}

export default useDebit;
