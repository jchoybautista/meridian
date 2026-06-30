import { Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { BottomNav } from "./components/layout/BottomNav";
import { AuthGuard } from "./components/auth/AuthGuard";
import { Dashboard } from "./pages/Dashboard";
import { MarketsCrypto } from "./pages/MarketsCrypto";
import { MarketsStocks } from "./pages/MarketsStocks";
import { AssetDetail } from "./pages/AssetDetail";
import { Watchlist } from "./pages/Watchlist";
import { Portfolio } from "./pages/Portfolio";
import { Wallet } from "./pages/Wallet";
import { Transactions } from "./pages/Transactions";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { NotFound } from "./pages/NotFound";
import { Settings } from "./pages/settings/Settings";
import { SettingsProfile } from "./pages/settings/SettingsProfile";
import { SettingsNotifications } from "./pages/settings/SettingsNotifications";
import { SettingsCurrency } from "./pages/settings/SettingsCurrency";
import { SettingsLanguage } from "./pages/settings/SettingsLanguage";
import { SettingsAbout } from "./pages/settings/SettingsAbout";
import { SettingsTerms } from "./pages/settings/SettingsTerms";
import { SettingsPrivacy } from "./pages/settings/SettingsPrivacy";
import { SettingsPrivacySettings } from "./pages/settings/SettingsPrivacySettings";

export default function App() {
  return (
    <div className="flex min-h-screen">
      <div className="app-bg" aria-hidden="true" />
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
            <Route
              path="/portfolio"
              element={
                <AuthGuard>
                  <Portfolio />
                </AuthGuard>
              }
            />
            <Route
              path="/wallet"
              element={
                <AuthGuard>
                  <Wallet />
                </AuthGuard>
              }
            />
            <Route
              path="/transactions"
              element={
                <AuthGuard>
                  <Transactions />
                </AuthGuard>
              }
            />
            <Route
              path="/settings"
              element={<Settings />}
            />
            <Route
              path="/settings/profile"
              element={
                <AuthGuard>
                  <SettingsProfile />
                </AuthGuard>
              }
            />
            <Route
              path="/settings/notifications"
              element={
                <AuthGuard>
                  <SettingsNotifications />
                </AuthGuard>
              }
            />
            <Route
              path="/settings/currency"
              element={
                <AuthGuard>
                  <SettingsCurrency />
                </AuthGuard>
              }
            />
            <Route
              path="/settings/language"
              element={
                <AuthGuard>
                  <SettingsLanguage />
                </AuthGuard>
              }
            />
            <Route
              path="/settings/about"
              element={
                <AuthGuard>
                  <SettingsAbout />
                </AuthGuard>
              }
            />
            <Route
              path="/settings/terms"
              element={
                <AuthGuard>
                  <SettingsTerms />
                </AuthGuard>
              }
            />
            <Route
              path="/settings/privacy"
              element={
                <AuthGuard>
                  <SettingsPrivacy />
                </AuthGuard>
              }
            />
            <Route
              path="/settings/privacy-settings"
              element={
                <AuthGuard>
                  <SettingsPrivacySettings />
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
