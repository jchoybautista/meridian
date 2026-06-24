import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import type { Asset } from "../../types";
import { ChangeBadge } from "../ui/ChangeBadge";
import { AssetIcon } from "../ui/AssetIcon";
import { formatCompactUsd, formatPrice } from "../../lib/format";

type SortKey = "rank" | "price" | "change24h" | "change7d" | "marketCap";

interface Props {
  assets: Asset[];
  /** Crypto shows a 7-day column; stocks omit it. */
  variant: "crypto" | "stock";
}

/** Shared sortable, searchable market list — table on desktop, cards on mobile. */
export function MarketTable({ assets, variant }: Props) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [asc, setAsc] = useState(true);
  const show7d = variant === "crypto";

  const rows = useMemo(() => {
    const filtered = assets.filter(
      (a) =>
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.symbol.toLowerCase().includes(query.toLowerCase()),
    );
    return [...filtered].sort((a, b) => {
      const av = (a[sortKey] ?? 0) as number;
      const bv = (b[sortKey] ?? 0) as number;
      return asc ? av - bv : bv - av;
    });
  }, [assets, query, sortKey, asc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === "rank");
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2.5 sm:max-w-sm focus-within:border-brand">
        <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <label htmlFor="market-filter" className="sr-only">
          Search {variant === "crypto" ? "cryptocurrencies" : "stocks"}
        </label>
        <input
          id="market-filter"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or symbol…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-muted"
        />
      </div>

      <div className="card overflow-hidden">
        {/* Desktop table */}
        <table className="hidden w-full text-left text-sm md:table">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-3">
                <SortButton label="#" active={sortKey === "rank"} asc={asc} onClick={() => toggleSort("rank")} />
              </th>
              <th scope="col" className="px-4 py-3">Name</th>
              <th scope="col" className="px-4 py-3 text-right">
                <SortButton label="Price" active={sortKey === "price"} asc={asc} onClick={() => toggleSort("price")} />
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                <SortButton label="24h" active={sortKey === "change24h"} asc={asc} onClick={() => toggleSort("change24h")} />
              </th>
              {show7d && (
                <th scope="col" className="px-4 py-3 text-right">
                  <SortButton label="7d" active={sortKey === "change7d"} asc={asc} onClick={() => toggleSort("change7d")} />
                </th>
              )}
              <th scope="col" className="px-4 py-3 text-right">
                <SortButton label="Market Cap" active={sortKey === "marketCap"} asc={asc} onClick={() => toggleSort("marketCap")} />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-line/60 last:border-0 hover:bg-elevated">
                <td className="px-4 py-3 text-ink-muted tabular-nums">{a.rank}</td>
                <td className="px-4 py-3">
                  <Link
                    to={`/asset/${a.type}/${a.id}`}
                    className="flex items-center gap-3 font-medium hover:text-brand"
                  >
                    <AssetIcon asset={a} size={28} />
                    <span>{a.name}</span>
                    <span className="text-xs uppercase text-ink-muted">{a.symbol}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatPrice(a.price)}</td>
                <td className="px-4 py-3 text-right"><ChangeBadge value={a.change24h} /></td>
                {show7d && (
                  <td className="px-4 py-3 text-right"><ChangeBadge value={a.change7d} /></td>
                )}
                <td className="px-4 py-3 text-right tabular-nums text-ink-muted">
                  {formatCompactUsd(a.marketCap)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile cards */}
        <ul className="divide-y divide-line md:hidden">
          {rows.map((a) => (
            <li key={a.id}>
              <Link to={`/asset/${a.type}/${a.id}`} className="flex items-center gap-3 p-3 hover:bg-elevated">
                <span className="w-6 text-xs text-ink-muted tabular-nums">{a.rank}</span>
                <AssetIcon asset={a} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.name}</p>
                  <p className="text-xs uppercase text-ink-muted">{a.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{formatPrice(a.price)}</p>
                  <ChangeBadge value={a.change24h} />
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {rows.length === 0 && (
          <p className="p-6 text-center text-ink-muted">No matches for “{query}”.</p>
        )}
      </div>
    </div>
  );
}

function SortButton({
  label,
  active,
  asc,
  onClick,
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 hover:text-ink ${active ? "text-ink" : ""}`}
      aria-label={`Sort by ${label}${active ? (asc ? ", ascending" : ", descending") : ""}`}
    >
      {label}
      {active &&
        (asc ? (
          <ArrowUp className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ArrowDown className="h-3 w-3" aria-hidden="true" />
        ))}
    </button>
  );
}
