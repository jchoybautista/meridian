const ENDPOINT = "https://api.alternative.me/fng/?limit=1";
const CACHE_KEY = "meridian:feargreed";
const TTL = 60 * 60 * 1000; // 1 hour

export interface FearGreedData {
  value: number;           // 0–100
  classification: string;  // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
}

interface FNGResponse {
  data: Array<{ value: string; value_classification: string }>;
}

export async function getFearGreed(): Promise<FearGreedData | null> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, ts } = JSON.parse(cached) as { data: FearGreedData; ts: number };
      if (Date.now() - ts < TTL) return data;
    }
  } catch { /* ignore */ }

  try {
    const res = await fetch(ENDPOINT, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`Fear & Greed ${res.status}`);
    const body = (await res.json()) as FNGResponse;
    const item = body?.data?.[0];
    if (!item) throw new Error("Empty response");
    const result: FearGreedData = {
      value: parseInt(item.value, 10),
      classification: item.value_classification,
    };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, ts: Date.now() })); } catch { /* ignore */ }
    return result;
  } catch { return null; }
}
