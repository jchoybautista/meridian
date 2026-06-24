import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { searchCrypto, type CryptoSearchResult } from "../../lib/coingecko";
import { STOCK_UNIVERSE } from "../../lib/alphavantage";

/** Global asset search with a live crypto results dropdown + stock matches. */
export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CryptoSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchCrypto(query)
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const stockMatches = STOCK_UNIVERSE.filter(
    (s) =>
      s.symbol.toLowerCase().includes(query.toLowerCase()) ||
      s.name.toLowerCase().includes(query.toLowerCase()),
  ).slice(0, 4);

  const go = (path: string) => {
    setQuery("");
    setOpen(false);
    navigate(path);
  };

  const hasResults = results.length > 0 || (query.trim() && stockMatches.length > 0);

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor="asset-search" className="sr-only">
        Search crypto and stocks
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2.5 focus-within:border-brand">
        <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <input
          id="asset-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search Bitcoin, Apple, ETH…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-muted"
          aria-expanded={Boolean(open && hasResults)}
          aria-controls="search-results"
          role="combobox"
        />
      </div>

      {open && hasResults && (
        <ul
          id="search-results"
          role="listbox"
          className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-lg border border-line bg-card py-1 shadow-xl"
        >
          {stockMatches.map((s) => (
            <li key={`stock-${s.symbol}`} role="option" aria-selected="false">
              <button
                type="button"
                onClick={() => go(`/asset/stock/${s.symbol}`)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-elevated"
              >
                <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-muted">
                  Stock
                </span>
                <span className="font-medium">{s.symbol}</span>
                <span className="truncate text-ink-muted">{s.name}</span>
              </button>
            </li>
          ))}
          {results.map((r) => (
            <li key={`crypto-${r.id}`} role="option" aria-selected="false">
              <button
                type="button"
                onClick={() => go(`/asset/crypto/${r.id}`)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-elevated"
              >
                <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-muted">
                  Crypto
                </span>
                <img src={r.thumb} alt="" className="h-5 w-5 rounded-full" loading="lazy" />
                <span className="font-medium">{r.symbol.toUpperCase()}</span>
                <span className="truncate text-ink-muted">{r.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
