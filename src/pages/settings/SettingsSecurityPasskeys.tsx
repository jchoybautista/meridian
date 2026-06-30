import { Key } from 'lucide-react';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

export function SettingsSecurityPasskeys() {
  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Passkeys" />
      <p className="mb-4 px-1 text-sm text-ink-muted">
        Passkeys let you sign in with your device's biometrics or PIN instead of
        a password — faster, phishing-resistant, and more secure.
      </p>
      <div className="card p-5 mb-3">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-elevated">
            <Key className="h-7 w-7 text-ink-muted" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold">No passkeys yet</p>
            <p className="mt-1 text-sm text-ink-muted">
              Add a passkey to sign in without a password.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white opacity-50 cursor-not-allowed"
          >
            Add Passkey
          </button>
        </div>
      </div>
      <p className="px-1 text-xs text-ink-muted">
        Passkeys are stored on your device and never shared with Meridian servers.
      </p>
    </div>
  );
}
