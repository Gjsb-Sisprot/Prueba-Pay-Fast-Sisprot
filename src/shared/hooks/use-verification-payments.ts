"use client";

import { useCallback, useEffect, useState } from "react";
import type {
	VerificationPaymentsResponse,
} from "@/shared/types/verification-payments.types";
import { getVerificationPayments } from "@/shared/lib/api/verification-payments";

export function useVerificationPayments(invoiceId?: number | string) {
	const [data, setData] = useState<VerificationPaymentsResponse | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchPayments = useCallback(
		async (signal?: AbortSignal) => {
			if (!invoiceId) return;
			setIsLoading(true);
			setError(null);
			try {
				const result = await getVerificationPayments(invoiceId);
				if (signal?.aborted) return;
				setData(result);
			} catch (err: unknown) {
				// AbortError from fetch when aborted: browsers throw a DOMException with name 'AbortError'
				if (typeof DOMException !== "undefined" && err instanceof DOMException && err.name === "AbortError") return;
				const message = err instanceof Error ? err.message : String(err ?? "Error al obtener pagos en verificación");
				setError(message);
			} finally {
				setIsLoading(false);
			}
		},
		[invoiceId]
	);

	useEffect(() => {
		const ac = new AbortController();
		fetchPayments(ac.signal);
		return () => ac.abort();
	}, [fetchPayments]);

	const refetch = useCallback(() => {
		fetchPayments();
	}, [fetchPayments]);

	return { data, isLoading, error, refetch } as const;
}

export default useVerificationPayments;

