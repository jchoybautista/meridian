import { Link } from "react-router-dom";
import type { Asset } from "../../types";
import { AssetIcon } from "../ui/AssetIcon";

interface Props {
  assets: Asset[];
  title?: string;
}

/** Wide grid of asset chips, mirroring the "Explore top crypto assets" section. */
export function ExploreAssets({ assets, title = "Explore top crypto assets" }: Props) {
  return (
    <section aria-labelledby="explore-heading">
      <h2 id="explore-heading" className="mb-4 text-xl font-extrabold tracking-tight">
        {title}
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {assets.map((a) => (
          <li key={a.id}>
            <Link
              to={`/asset/${a.type}/${a.id}`}
              className="card flex items-center gap-2.5 p-3 transition-colors hover:border-brand/60 hover:bg-elevated"
            >
              <AssetIcon asset={a} size={30} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">{a.name}</p>
                <p className="text-[10px] uppercase text-ink-muted">{a.symbol}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
