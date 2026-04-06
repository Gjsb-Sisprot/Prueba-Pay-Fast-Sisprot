// Lightweight utility to fetch contracts for a client.
// Exported as a plain function so it can be used from hooks, server actions or components.
import type { ContractsResponse } from "@/shared/lib/api-client";

export async function fetchContractsByClient(clientId: number): Promise<ContractsResponse> {
  if (!clientId || typeof clientId !== "number") {
    throw new Error("Invalid clientId");
  }

  const url = `/api/contracts?client=${encodeURIComponent(clientId.toString())}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    // Try to extract error details from the body when available
    let errBody: unknown = null;
    try {
      errBody = await res.json();
    } catch (e) {
      // ignore parse errors
      console.error("Error parsing error response body", e);
    }

    const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
    const errorMessage: string = isRecord(errBody) && typeof (errBody as Record<string, unknown>).error === "string"
      ? String((errBody as Record<string, unknown>).error)
      : `Error al obtener información de contratos (status ${res.status})`;

    throw new Error(errorMessage);
  }

  // Parse and return as ContractsResponse. We keep this simple because the API client
  // elsewhere already defines and enforces this shape.
  const data = await res.json().catch(() => ({})) as ContractsResponse;
  return data;
}

export default fetchContractsByClient;
