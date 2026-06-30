import { ShieldCheck } from 'lucide-react';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

export function SettingsSecurityTrustedDevices() {
  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Trusted Devices" />
      <div className="card p-5 mb-3">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-elevated">
            <ShieldCheck className="h-7 w-7 text-ink-muted" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold">No trusted devices yet</p>
            <p className="mt-1 text-sm text-ink-muted">
              When you verify a new device, it appears here.
            </p>
          </div>
        </div>
      </div>
      <p className="px-1 text-xs text-ink-muted">
        Trusted devices skip 2FA verification for 30 days.
      </p>
    </div>
  );
}
