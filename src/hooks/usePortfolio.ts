import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getStockList } from "../lib/alphavantage";
import { binanceSymbol, fetchTicker } from "../lib/binance";
import { deriveHoldings, portfolioSummary } from "../lib/portfolio";
import type { Transaction, HoldingWithPnL, PortfolioSummary, PriceInfo } from "../types";

type NewTransaction = Omit<Transaction, "id" | "user_id" | "created_at">;

export function usePortfolio() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [priceMap,     setPriceMap]     = useState<Record<string, PriceInfo>>({});
  const [isLive,       setIsLive]       = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // Load transactions from Supabase
  const load = useCallback(async () => {
    if (!supabase || !user) { setTransactions([]); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("portfolio_transactions")
      .select("*")
      .order("transacted_at", { ascending: false });
    if (err) setError(err.message);
    else setTransactions((data ?? []) as Transaction[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  // Fetch live prices for held assets
  useEffect(() => {
    if (transactions.length === 0) return;

    const cryptoIds = transactions
      .filter((t) => t.asset_type === "crypto")
      .map((t) => t.asset_symbol);
    const stockIds  = transactions
      .filter((t) => t.asset_type === "stock")
      .map((t) => t.asset_id);

    let cancelled = false;

    async function fetchPrices() {
      const map: Record<string, PriceInfo> = {};

      // Crypto: Binance ticker for each unique symbol
      await Promise.allSettled(
        [...new Set(cryptoIds)].map(async (sym) => {
          const bnSym = binanceSymbol(sym);
          if (!bnSym) return;
          const ticker = await fetchTicker(bnSym);
          if (ticker && !cancelled) {
            // find the asset_id for this symbol
            const assetId =
              transactions.find(
                (t) => t.asset_symbol === sym && t.asset_type === "crypto",
              )?.asset_id ?? sym.toLowerCase();
            map[assetId] = { price: ticker.price, change24h: ticker.changePercent };
          }
        }),
      );

      // Stocks: FMP bulk quote
      if (stockIds.length > 0) {
        try {
          const { assets } = await getStockList();
          for (const a of assets) {
            if (stockIds.includes(a.id)) {
              map[a.id] = { price: a.price, change24h: a.change24h };
            }
          }
        } catch {
          /* keep whatever prices we have */
        }
      }

      if (!cancelled) {
        setPriceMap((prev) => ({ ...prev, ...map }));
        setIsLive(Object.keys(map).length > 0);
      }
    }

    void fetchPrices();
    const timer = setInterval(
      () => {
        if (document.visibilityState === "visible") void fetchPrices();
      },
      60_000,
    );
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [transactions]);

  const holdings: HoldingWithPnL[] = useMemo(
    () => deriveHoldings(transactions, priceMap),
    [transactions, priceMap],
  );

  const summary: PortfolioSummary = useMemo(
    () => portfolioSummary(holdings),
    [holdings],
  );

  const addTransaction = useCallback(
    async (t: NewTransaction): Promise<{ error: string | null }> => {
      if (!supabase || !user) return { error: "Sign in to manage your portfolio." };
      const { error: err } = await supabase.from("portfolio_transactions").insert({
        ...t,
        user_id: user.id,
      });
      if (err) return { error: err.message };
      await load();
      return { error: null };
    },
    [user, load],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!supabase) return;
      await supabase.from("portfolio_transactions").delete().eq("id", id);
      await load();
    },
    [load],
  );

  return {
    transactions,
    holdings,
    summary,
    isLive,
    loading,
    error,
    addTransaction,
    deleteTransaction,
    reload: load,
  };
}
