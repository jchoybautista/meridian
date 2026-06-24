import { Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { BottomNav } from "./components/layout/BottomNav";
import { AuthGuard } from "./components/auth/AuthGuard";
import { Dashboard } from "./pages/Dashboard";
import { MarketsCrypto } from "./pages/MarketsCrypto";
import { MarketsStocks } from "./pages/MarketsStocks";
import { AssetDetail } from "./pages/AssetDetail";
import { Watchlist } from "./pages/Watchlist";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { NotFound } from "./pages/NotFound";

export default function App() {
  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only skip-link">
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main
          id="main"
          className="w-full flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10"
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/markets/crypto" element={<MarketsCrypto />} />
            <Route path="/markets/stocks" element={<MarketsStocks />} />
            <Route path="/asset/:type/:id" element={<AssetDetail />} />
            <Route
              path="/watchlist"
              element={
                <AuthGuard>
                  <Watchlist />
                </AuthGuard>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
