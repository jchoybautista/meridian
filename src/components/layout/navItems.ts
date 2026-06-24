import {
  LayoutDashboard,
  Bitcoin,
  LineChart,
  Star,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Requires authentication to be useful. */
  protected?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/markets/crypto", label: "Crypto", icon: Bitcoin },
  { to: "/markets/stocks", label: "Stocks", icon: LineChart },
  { to: "/watchlist", label: "Watchlist", icon: Star, protected: true },
  { to: "/portfolio", label: "Portfolio", icon: Wallet, protected: true },
];
