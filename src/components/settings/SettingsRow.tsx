import { Link } from 'react-router-dom';
import { ChevronRight, type LucideIcon } from 'lucide-react';

interface Props {
  icon?: LucideIcon;
  label: string;
  value?: string;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
}

export function SettingsRow({ icon: Icon, label, value, to, onClick, danger = false }: Props) {
  const inner = (
    <>
      <div className="flex items-center gap-3">
        {Icon && (
          <Icon
            className={`h-5 w-5 shrink-0 ${danger ? 'text-down' : 'text-ink-muted'}`}
            aria-hidden="true"
          />
        )}
        <span className={`text-sm font-medium ${danger ? 'text-down' : 'text-ink'}`}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm text-ink-muted">{value}</span>}
        <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
      </div>
    </>
  );

  const cls =
    'flex w-full min-h-[48px] items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-elevated';

  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
