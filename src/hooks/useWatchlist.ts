import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { Asset, WatchlistItem } from "../types";

/**
 * Manages the signed-in user's watchlist via Supabase. Exposes the saved
 * items plus add/remove helpers and an `isWatched` lookup.
 */
export function useWatchlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setItems((data ?? []) as WatchlistItem[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const isWatched = useCallback(
    (assetId: string) => items.some((i) => i.asset_id === assetId || i.asset_symbol === assetId),
    [items],
  );

  const add = useCallback(
    async (asset: Asset) => {
      if (!supabase || !user) return { error: "Sign in to use your watchlist." };
      const { error } = await supabase.from("watchlist").insert({
        user_id: user.id,
        asset_symbol: asset.symbol,
        asset_name: asset.name,
        asset_type: asset.type,
        asset_id: asset.id,
      });
      if (error) return { error: error.message };
      await load();
      return { error: null };
    },
    [user, load],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!supabase) return;
      await supabase.from("watchlist").delete().eq("id", id);
      await load();
    },
    [load],
  );

  const removeByAsset = useCallback(
    async (assetId: string) => {
      if (!supabase || !user) return;
      await supabase.from("watchlist").delete().eq("asset_id", assetId);
      await load();
    },
    [user, load],
  );

  return { items, loading, error, isWatched, add, remove, removeByAsset, reload: load };
}
