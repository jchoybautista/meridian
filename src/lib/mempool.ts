// Free Bitcoin blockchain data from mempool.space — no API key, CORS-enabled.
// All functions degrade to deterministic sample data so the dashboard never breaks.

const BASE = "https://mempool.space/api";

export interface BlockSummary {
  height: number;
  timestamp: number; // unix seconds
  txCount: number;
  sizeMB: number;
}

export interface TxSummary {
  txid: string;
  valueBtc: number;
  feeSat: number;
}

interface MempoolBlock {
  height: number;
  timestamp: number;
  tx_count: number;
  size: number; // bytes
}

interface MempoolRecentTx {
  txid: string;
  fee: number; // sats
  value: number; // sats
}

const SATS = 100_000_000;

function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
}

/** Recent Bitcoin blocks. */
export async function getLatestBlocks(limit = 5): Promise<{ blocks: BlockSummary[]; sample: boolean }> {
  try {
    const res = await fetchWithTimeout(`${BASE}/v1/blocks`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as MempoolBlock[];
    return {
      blocks: data.slice(0, limit).map((b) => ({
        height: b.height,
        timestamp: b.timestamp,
        txCount: b.tx_count,
        sizeMB: +(b.size / 1_000_000).toFixed(2),
      })),
      sample: false,
    };
  } catch {
    return { blocks: sampleBlocks(limit), sample: true };
  }
}

/** Recent mempool (unconfirmed) transactions. */
export async function getLatestTransactions(limit = 8): Promise<{ txs: TxSummary[]; sample: boolean }> {
  try {
    const res = await fetchWithTimeout(`${BASE}/mempool/recent`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as MempoolRecentTx[];
    return {
      txs: data.slice(0, limit).map((t) => ({
        txid: t.txid,
        valueBtc: +(t.value / SATS).toFixed(8),
        feeSat: t.fee,
      })),
      sample: false,
    };
  } catch {
    return { txs: sampleTxs(limit), sample: true };
  }
}

function sampleBlocks(limit: number): BlockSummary[] {
  const base = 955_191;
  const now = Math.floor(Date.now() / 1000);
  return Array.from({ length: limit }, (_, i) => ({
    height: base - i,
    timestamp: now - i * 600,
    txCount: 4000 + ((i * 317) % 1500),
    sizeMB: +(1.5 + ((i * 0.07) % 0.4)).toFixed(2),
  }));
}

function sampleTxs(limit: number): TxSummary[] {
  return Array.from({ length: limit }, (_, i) => ({
    txid: (Math.abs(Math.sin(i + 1)) * 1e16).toString(16).slice(0, 12),
    valueBtc: +(0.0001 + (Math.abs(Math.cos(i)) * 0.002)).toFixed(8),
    feeSat: 1500 + ((i * 211) % 4000),
  }));
}
