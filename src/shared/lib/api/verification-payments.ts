import type { VerificationPaymentsResponse } from "@/shared/types/verification-payments.types";

/**
 * Llama a la ruta interna /api/verification-payments?invoice={id}
 */
export async function getVerificationPayments(
	invoiceId: number | string
): Promise<VerificationPaymentsResponse> {
	const params = new URLSearchParams({ invoice: String(invoiceId) });
	const res = await fetch(`/api/verification-payments?${params.toString()}`, {
		method: "GET",
		headers: { "Content-Type": "application/json" },
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`Error fetching verification payments: ${res.status} ${text}`);
	}

	const json = await res.json();
	return json as VerificationPaymentsResponse;
}

export default getVerificationPayments;

export async function deleteVerificationPayment(id: number | string, eventType: string = "canceled") {
  const res = await fetch(`/api/verification-payments`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, event_type: eventType }),
  });

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`Error deleting verification payment: ${res.status} ${text}`);
	}

	// Try to parse JSON, but return empty if none
	const json = await res.json().catch(() => ({}));
	return json;
}
