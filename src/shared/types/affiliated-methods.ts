export interface PaymentMethod {
  id: number;
  name: string;
  client: number;
  client_name: string;
  method: number;
  method_name: string;
  sender: string;
  identification_display: string;
  bank_data: string;
  status: boolean;
  created_by_name: string;
  created_at: string; 
}


export interface PaginatedPaymentMethodsResponse {
  /** Número total de elementos disponibles (en todas las páginas). */
  count: number;
  /** URL para la siguiente página de resultados (o null si es la última). */
  next: string | null;
  /** URL para la página anterior de resultados (o null si es la primera). */
  previous: string | null;
  /** Array de resultados, tipado con la interfaz PaymentMethod. */
  results: PaymentMethod[];
}