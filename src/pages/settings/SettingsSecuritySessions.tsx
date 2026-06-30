import { Monitor, Smartphone } from 'lucide-react';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

const SESSIONS = [
  {
    id: 1,
    device: 'Chrome · macOS',
    location: 'Manila, PH',
    lastSeen: 'Active now',
    isCurrent: true,
    Icon: Monitor,
  },
  {
    id: 2,
    device: 'Safari · iPhone',
    location: 'Manila, PH',
    lastSeen: '2 hours ago',
    isCurrent: false,
    Icon: Smartphone,
  },
] as const;

export function SettingsSecuritySessions() {
  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Active Sessions" />
      <div className="card divide-y divide-line mb-3">
        {SESSIONS.map(({ id, device, location, lastSeen, isCurrent, Icon }) => (
          <div key={id} className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <Icon className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{device}</p>
                <p className="text-xs text-ink-muted">
                  {location} · {lastSeen}
                </p>
              </div>
            </div>
            {isCurrent ? (
              <span className="shrink-0 rounded-full bg-up/15 px-2 py-0.5 text-xs font-semibold text-up">
                This device
              </span>
            ) : (
              <button
                type="button"
                disabled
                className="shrink-0 rounded-lg border border-down px-3 py-1.5 text-xs font-semibold text-down opacity-50 cursor-not-allowed"
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="px-1 text-xs text-ink-muted">
        Revoking a session signs that device out immediately.
      </p>
    </div>
  );
}
