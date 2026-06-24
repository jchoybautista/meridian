import type { Asset } from "../../types";

interface Props {
  asset: Pick<Asset, "symbol" | "name" | "image" | "type">;
  size?: number;
}

/** Round asset icon: coin image for crypto, lettered monogram for stocks. */
export function AssetIcon({ asset, size = 36 }: Props) {
  const dimension = { width: size, height: size };

  if (asset.image) {
    return (
      <img
        src={asset.image}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="rounded-full bg-elevated object-cover"
        style={dimension}
      />
    );
  }

  // Deterministic colour from the symbol so each stock gets a stable hue.
  const hue = [...asset.symbol].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span
      aria-hidden="true"
      className="flex items-center justify-center rounded-full font-semibold text-white"
      style={{
        ...dimension,
        backgroundColor: `hsl(${hue} 55% 45%)`,
        fontSize: size * 0.4,
      }}
    >
      {asset.symbol.slice(0, 2)}
    </span>
  );
}
