import { Link } from "react-router-dom";
import { Sparkles, TrendingUp } from "lucide-react";

/** Branded promo card that anchors the top-left of the bento grid. */
export function HeroPromo() {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl bg-gradient-to-br from-brand via-indigo-600 to-purple-700 p-5 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
      />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Live market data
        </span>
        <h2 className="mt-4 text-2xl font-extrabold leading-tight">
          Track every market in one place.
        </h2>
        <p className="mt-2 text-sm text-white/80">
          Real-time crypto prices, market heatmaps, and on-chain activity — free
          and open.
        </p>
      </div>
      <div className="relative mt-5 flex flex-wrap gap-2">
        <Link
          to="/markets/crypto"
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-brand hover:bg-white/90"
        >
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
          Explore markets
        </Link>
        <Link
          to="/register"
          className="rounded-lg border border-white/40 px-3.5 py-2 text-sm font-semibold hover:bg-white/10"
        >
          Create watchlist
        </Link>
      </div>
    </div>
  );
}
