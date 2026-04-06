import { Bank } from "@/shared/types/banks-data";

export async function fetchBanks(): Promise<Bank[]> {
  const res = await fetch('/api/banks', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error(`Error fetching banks: ${res.status}`);
  }

  const data = await res.json().catch(() => []);
  // Expecting an array of banks
  return Array.isArray(data) ? (data as Bank[]) : [];
}
