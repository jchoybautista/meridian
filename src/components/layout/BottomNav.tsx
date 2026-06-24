import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "./navItems";

/** Mobile bottom navigation bar. Hidden on desktop (Sidebar takes over). */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-content items-stretch justify-around">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors ${
                  isActive ? "text-brand" : "text-ink-muted hover:text-ink"
                }`
              }
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
