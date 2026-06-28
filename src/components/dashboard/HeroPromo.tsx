import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, TrendingUp } from "lucide-react";

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4";

const FADE_DURATION = 0.5;

const CRYPTOS = [
  { ticker: "BTC",  name: "Bitcoin",   img: "https://coin-images.coingecko.com/coins/images/1/small/bitcoin.png" },
  { ticker: "ETH",  name: "Ethereum",  img: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png" },
  { ticker: "SOL",  name: "Solana",    img: "https://coin-images.coingecko.com/coins/images/4128/small/solana.png" },
  { ticker: "BNB",  name: "BNB",       img: "https://coin-images.coingecko.com/coins/images/825/small/bnb-icon2_2x.png" },
  { ticker: "XRP",  name: "XRP",       img: "https://coin-images.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png" },
  { ticker: "ADA",  name: "Cardano",   img: "https://coin-images.coingecko.com/coins/images/975/small/cardano.png" },
  { ticker: "DOGE", name: "Dogecoin",  img: "https://coin-images.coingecko.com/coins/images/5/small/dogecoin.png" },
  { ticker: "AVAX", name: "Avalanche", img: "https://coin-images.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png" },
  { ticker: "DOT",  name: "Polkadot",  img: "https://coin-images.coingecko.com/coins/images/12171/small/polkadot.png" },
  { ticker: "MATIC","name": "Polygon", img: "https://coin-images.coingecko.com/coins/images/4713/small/polygon.png" },
];

export function HeroPromo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let rafId: number;

    function updateFade() {
      if (!video || !video.duration) {
        rafId = requestAnimationFrame(updateFade);
        return;
      }
      const { currentTime, duration } = video;
      if (currentTime < FADE_DURATION) {
        video.style.opacity = String(currentTime / FADE_DURATION);
      } else if (duration - currentTime <= FADE_DURATION) {
        video.style.opacity = String(Math.max(0, (duration - currentTime) / FADE_DURATION));
      } else {
        video.style.opacity = "1";
      }
      rafId = requestAnimationFrame(updateFade);
    }

    function onCanPlay() {
      video!.play().catch(() => {});
      rafId = requestAnimationFrame(updateFade);
    }

    function onEnded() {
      video!.style.opacity = "0";
      setTimeout(() => {
        if (video) { video.currentTime = 0; video.play(); }
      }, 100);
    }

    video.addEventListener("canplay", onCanPlay, { once: true });
    video.addEventListener("ended", onEnded);
    video.play().catch(() => {});

    return () => {
      cancelAnimationFrame(rafId);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl text-white">
      {/* Animated video background */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover opacity-0 z-0"
        muted
        playsInline
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>

      {/* Gradient overlay — keeps text legible over the video */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-950/85 via-indigo-900/70 to-purple-950/85 z-[1]" />

      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl z-[2]"
      />

      {/* Main content */}
      <div className="relative z-[3] flex flex-col flex-1 justify-between p-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Live market data
          </span>
          <h2 className="mt-4 text-2xl font-extrabold leading-tight">
            Track every market in one place.
          </h2>
          <p className="mt-2 text-sm text-white/80">
            Real-time crypto prices, market heatmaps, and on-chain activity — free and open.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
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

      {/* Crypto ticker marquee */}
      <div
        className="relative z-[3] overflow-hidden pb-3 pt-2"
        style={{
          WebkitMaskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          maskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        }}
      >
        <div className="flex w-max animate-marquee gap-6">
          {/* Two copies for seamless looping */}
          {[...CRYPTOS, ...CRYPTOS].map((c, i) => (
            <div key={i} className="flex flex-shrink-0 items-center gap-1.5">
              <img src={c.img} alt={c.name} className="h-4 w-4 rounded-full" />
              <span className="text-xs font-semibold text-white/75">{c.ticker}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
