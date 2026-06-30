import {
  LayoutDashboard,
  Bitcoin,
  LineChart,
  Star,
  Wallet,
  PiggyBank,
  Receipt,
  Settings,
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
  { to: "/wallet", label: "Wallet", icon: PiggyBank, protected: true },
  { to: "/transactions", label: "Transactions", icon: Receipt, protected: true },
  { to: "/settings", label: "Settings", icon: Settings, protected: true },
];
