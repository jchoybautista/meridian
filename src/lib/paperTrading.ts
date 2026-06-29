import { supabase } from "./supabase";

export type AssetType = "crypto" | "stock";
export type OrderSide = "buy" | "sell";
export type OrderType = "limit" | "market" | "stop-limit";
export type OrderStatus = "pending" | "filled" | "cancelled";

export interface PaperWallet {
  id: string;
  user_id: string;
  balance_usd: number;
  created_at: string;
}

export interface PaperOrder {
  id: string;
  user_id: string;
  asset_id: string;
  asset_type: AssetType;
  asset_symbol: string;
  asset_name: string;
  side: OrderSide;
  order_type: OrderType;
  quantity: number;
  price: number | null;
  stop_price: number | null;
  tp_price: number | null;
  sl_price: number | null;
  leverage: number;
  status: OrderStatus;
  filled_price: number | null;
  filled_at: string | null;
  created_at: string;
}

export interface Position {
  asset_id: string;
  asset_type: AssetType;
  asset_symbol: string;
  asset_name: string;
  quantity: number;
  avg_cost: number;
  total_cost: number;
}

export interface NewOrder {
  user_id: string;
  asset_id: string;
  asset_type: AssetType;
  asset_symbol: string;
  asset_name: string;
  side: OrderSide;
  order_type: OrderType;
  quantity: number;
  price: number | null;
  stop_price: number | null;
  tp_price: number | null;
  sl_price: number | null;
  leverage: number;
}

export async function getOrCreateWallet(userId: string): Promise<PaperWallet> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data: existing, error: lookupError } = await supabase
    .from("paper_wallet")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return existing as PaperWallet;
  const { data, error } = await supabase
    .from("paper_wallet")
    .insert({ user_id: userId, balance_usd: 10000 })
    .select()
    .single();
  if (error) throw error;
  return data as PaperWallet;
}

export async function addFunds(userId: string, amount: number): Promise<PaperWallet> {
  if (!supabase) throw new Error("Supabase not configured");
  const wallet = await getOrCreateWallet(userId);
  const { data, error } = await supabase
    .from("paper_wallet")
    .update({ balance_usd: wallet.balance_usd + amount })
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as PaperWallet;
}

export async function adjustBalance(userId: string, delta: number): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const wallet = await getOrCreateWallet(userId);
  const { error } = await supabase
    .from("paper_wallet")
    .update({ balance_usd: wallet.balance_usd + delta })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getUserOrders(userId: string): Promise<PaperOrder[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("paper_orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PaperOrder[];
}

export async function getPendingOrders(userId: string): Promise<PaperOrder[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("paper_orders")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending");
  if (error) throw error;
  return (data ?? []) as PaperOrder[];
}

export async function placeOrder(order: NewOrder): Promise<PaperOrder> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("paper_orders")
    .insert({ ...order, status: "pending" })
    .select()
    .single();
  if (error) throw error;
  return data as PaperOrder;
}

export async function fillOrder(
  orderId: string,
  filledPrice: number,
  side: OrderSide,
  quantity: number,
  leverage: number,
  userId: string,
): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase
    .from("paper_orders")
    .update({
      status: "filled",
      filled_price: filledPrice,
      filled_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) throw error;
  const cost = (filledPrice * quantity) / leverage;
  await adjustBalance(userId, side === "buy" ? -cost : cost);
}

export async function cancelOrder(orderId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase
    .from("paper_orders")
    .update({ status: "cancelled" })
    .eq("id", orderId);
  if (error) throw error;
}

export function derivePositions(orders: PaperOrder[]): Position[] {
  const map = new Map<
    string,
    { asset_id: string; asset_type: AssetType; asset_symbol: string; asset_name: string; quantity: number; total_cost: number }
  >();

  for (const o of orders.filter((o) => o.status === "filled")) {
    if (o.filled_price == null) continue;
    const entry = map.get(o.asset_id) ?? {
      asset_id: o.asset_id,
      asset_type: o.asset_type,
      asset_symbol: o.asset_symbol,
      asset_name: o.asset_name,
      quantity: 0,
      total_cost: 0,
    };
    if (o.side === "buy") {
      entry.quantity += o.quantity;
      entry.total_cost += (o.filled_price * o.quantity) / o.leverage;
    } else {
      entry.quantity -= o.quantity;
      entry.total_cost -= (o.filled_price * o.quantity) / o.leverage;
    }
    map.set(o.asset_id, entry);
  }

  return Array.from(map.values())
    .filter((p) => p.quantity > 1e-8)
    .map((p) => ({ ...p, avg_cost: p.total_cost / p.quantity }));
}
