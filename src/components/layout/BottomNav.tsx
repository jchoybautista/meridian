import { NavLink } from "react-router-dom";
import { BOTTOM_NAV_ITEMS } from "./navItems";

/** Mobile bottom navigation bar. Hidden on desktop (Sidebar takes over). */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="glass-chrome fixed inset-x-0 bottom-0 z-40 border-t border-line md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-medium transition-colors ${
                  isActive ? "text-brand" : "text-ink-muted hover:text-ink"
                }`
              }
            >
              <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
