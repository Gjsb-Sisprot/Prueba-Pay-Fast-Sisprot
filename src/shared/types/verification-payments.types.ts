export interface VerificationPayment {
	id: number;
	event_type: string;
	event_type_name: string;
	reference: string;
	observation: string | null;
	payment_image: string | null;
	attempt_count: number;
	send: boolean;
	updated_by_name: string | null;
	created_at: string; // ISO datetime string

	// Información detallada del pago (puede variar según el evento)
	data: VerificationPaymentData | null;
}

export interface VerificationPaymentMetadata {
	bank_origin?: string;
	amount?: string; // normalmente viene como string "10.00"
}

export interface VerificationPaymentData {
	reference: string;
	sender?: string | null;
	date?: string | null; // YYYY-MM-DD
	payment_method?: string | null;
	metadata?: VerificationPaymentMetadata | null;
	invoice_id?: number | null;
	client?: string | null;
	client_phone?: string | null;
	client_email?: string | null;
	bank_associated?: string | null;
	account_number_associated?: string | null;
	contract?: number | null;
	cycle?: number | null;
	migrate?: boolean | null;
	error?: string | null;
	event_type?: string | null;
	event_type_name?: string | null;
	// cualquier otra propiedad dinámica que pueda venir desde el backend
	[key: string]: unknown;
}

export interface VerificationPaymentsResponse {
	count: number;
	next: string | null;
	previous: string | null;
	results: VerificationPayment[];
}

export default VerificationPaymentsResponse;
