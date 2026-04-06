import { PaginatedPaymentMethodsResponse } from "@/shared/types/affiliated-methods";

interface MethodAffiliatePayload {
    client: number,
    method: number,
    sender: string
}
export interface MethodAffiliatePayloadWithBank {
    client: number,
    method: number,
    sender: string,
    bank?: number
}
export interface AfiliationResponse {
    success: boolean;
    status: number;
    message?: string;
    data: unknown;
}


export const AffiliatePaymentMethod = async (payload: MethodAffiliatePayload): Promise<AfiliationResponse> => {
    const response = await fetch("/api/methods/affiliate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload }),
    });

    const result: AfiliationResponse = await response.json();

    if (!response.ok) {
        throw new Error(result.message || "Error al afiliar metodo de pago");
    }

    return result;
}

export async function fetchAffiliateMethods(clientId: number): Promise<PaginatedPaymentMethodsResponse> {
    const res = await fetch(`/api/methods/affiliate?client_id=${clientId}`);

    if (!res.ok) {
        throw new Error("Error al obtener los métodos afiliados");
    }

    const data: PaginatedPaymentMethodsResponse = await res.json();
        console.log(data)

    return data;
}

export interface DeleteResponse {
    success: boolean;
    status: number;
    message?: string;
    data?: unknown;
}

export async function deleteAffiliateMethod(id: number): Promise<DeleteResponse> {
    const response = await fetch(`/api/methods/affiliate`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
    });

    // Si la API interna devuelve 204 No Content, devolvemos un objeto consistente
    if (response.status === 204) {
        return { success: true, status: 204, message: "Eliminado" } as DeleteResponse;
    }

    const result: DeleteResponse = await response.json().catch(() => ({ success: false, status: response.status, message: "Error parsing response" } as DeleteResponse));

    if (!response.ok) {
        throw new Error(result.message || "Error al eliminar método afiliado");
    }

    return result;
}

export interface UpdatePayload {
    name?: string;
    sender?: string;
    method?: number;
}

export interface UpdatePayloadWithBank {
    name?: string;
    sender?: string;
    method?: number;
    bank?: number | null;
    identification?: string | null;
}

export async function updateAffiliateMethod(id: number, payload: UpdatePayloadWithBank): Promise<DeleteResponse> {
    const response = await fetch(`/api/methods/affiliate`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, payload }),
    });

    if (response.status === 204) {
        return { success: true, status: 204, message: "Actualizado" } as DeleteResponse;
    }

    const result: DeleteResponse = await response.json().catch(() => ({ success: false, status: response.status, message: "Error parsing response" } as DeleteResponse));

    if (!response.ok) {
        throw new Error(result.message || "Error al actualizar método afiliado");
    }

    return result;
}