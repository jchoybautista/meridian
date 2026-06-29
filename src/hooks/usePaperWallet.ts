import { useState, useEffect, useCallback } from "react";
import {
  getOrCreateWallet,
  addFunds as addFundsDB,
  type PaperWallet,
} from "../lib/paperTrading";

interface UsePaperWalletResult {
  wallet: PaperWallet | null;
  loading: boolean;
  error: string | null;
  addFunds: (amount: number) => Promise<void>;
  refresh: () => void;
}

export function usePaperWallet(userId: string | undefined): UsePaperWalletResult {
  const [wallet, setWallet] = useState<PaperWallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOrCreateWallet(userId)
      .then((w) => { if (!cancelled) setWallet(w); })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load wallet");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, tick]);

  const addFunds = useCallback(async (amount: number) => {
    if (!userId) return;
    const updated = await addFundsDB(userId, amount);
    setWallet(updated);
  }, [userId]);

  return { wallet, loading, error, addFunds, refresh };
}
