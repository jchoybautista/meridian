import { useState, useEffect, useCallback, useRef } from "react";
import {
  getUserOrders,
  getPendingOrders,
  placeOrder as placeOrderDB,
  fillOrder,
  cancelOrder as cancelOrderDB,
  derivePositions,
  type PaperOrder,
  type NewOrder,
  type Position,
  type OrderSide,
} from "../lib/paperTrading";

interface UsePaperOrdersResult {
  orders: PaperOrder[];
  positions: Position[];
  loading: boolean;
  placeOrder: (order: NewOrder) => Promise<PaperOrder>;
  cancelOrder: (orderId: string) => Promise<void>;
  refresh: () => void;
}

export function usePaperOrders(
  userId: string | undefined,
  currentPrice: number,
  onFill?: () => void,
): UsePaperOrdersResult {
  const [orders, setOrders] = useState<PaperOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const priceRef = useRef(currentPrice);
  priceRef.current = currentPrice;

  // Load all orders on mount and on refresh
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    getUserOrders(userId)
      .then((o) => { if (!cancelled) setOrders(o); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, tick]);

  // Background fill checker: every 5 s, fill any pending orders whose trigger is met
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(async () => {
      const price = priceRef.current;
      if (!price) return;
      const pending = await getPendingOrders(userId);
      let filled = false;
      for (const o of pending) {
        let shouldFill = false;
        if (o.order_type === "market") {
          shouldFill = true;
        } else if (o.order_type === "limit") {
          if (o.side === "buy" && o.price != null) shouldFill = price <= o.price;
          if (o.side === "sell" && o.price != null) shouldFill = price >= o.price;
        } else if (o.order_type === "stop-limit") {
          // Simplified: fill when stop price is crossed (uses stop as the execution price)
          if (o.side === "sell" && o.stop_price != null) shouldFill = price <= o.stop_price;
          if (o.side === "buy" && o.stop_price != null) shouldFill = price >= o.stop_price;
        }
        if (shouldFill) {
          await fillOrder(o.id, price, o.side as OrderSide, o.quantity, o.leverage, userId);
          filled = true;
        }
      }
      if (filled) {
        onFill?.();
        refresh();
      }
    }, 5000);
    return () => clearInterval(id);
  }, [userId, refresh, onFill]);

  const placeOrder = useCallback(async (order: NewOrder): Promise<PaperOrder> => {
    const placed = await placeOrderDB(order);
    if (placed.order_type === "market") {
      const price = priceRef.current;
      if (price > 0) {
        await fillOrder(placed.id, price, placed.side, placed.quantity, placed.leverage, userId!);
        onFill?.();
      }
    }
    refresh();
    return placed;
  }, [userId, refresh, onFill]);

  const cancelOrder = useCallback(async (orderId: string) => {
    await cancelOrderDB(orderId);
    refresh();
  }, [refresh]);

  return { orders, positions: derivePositions(orders), loading, placeOrder, cancelOrder, refresh };
}
