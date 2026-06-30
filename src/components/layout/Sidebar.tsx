import { NavLink } from "react-router-dom";
import { LogIn, LogOut, TrendingUp } from "lucide-react";
import { NAV_ITEMS } from "./navItems";
import { useAuth } from "../../context/AuthContext";

/** Fixed desktop sidebar navigation. Hidden on mobile (BottomNav takes over). */
export function Sidebar() {
  const { user, signOut, configured } = useAuth();

  return (
    <aside className="glass-chrome sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line p-4 md:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <TrendingUp className="h-6 w-6 text-brand" aria-hidden="true" />
        <span className="text-xl font-extrabold tracking-tight">Meridian</span>
      </div>

      <nav aria-label="Primary">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand/15 text-brand"
                      : "text-ink-muted hover:bg-elevated hover:text-ink"
                  }`
                }
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto border-t border-line pt-4">
        {user ? (
          <div className="space-y-2">
            <p className="truncate px-3 text-xs text-ink-muted" title={user.email ?? ""}>
              {user.email}
            </p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-elevated hover:text-ink"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              Sign out
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            className="flex items-center gap-3 rounded-lg bg-brand px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <LogIn className="h-5 w-5" aria-hidden="true" />
            {configured ? "Sign in" : "Sign in (setup)"}
          </NavLink>
        )}
      </div>
    </aside>
  );
}
