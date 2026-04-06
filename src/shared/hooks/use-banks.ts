"use client";

import { useEffect, useState } from "react";
import type { Bank } from "@/shared/types/banks-data";
import { fetchBanks } from "@/shared/lib/api/banks";

export function useBanks() {
  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBanks();
      setBanks(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBanks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { banks, loading, error, reload: load };
}
