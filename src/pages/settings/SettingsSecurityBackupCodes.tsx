import { useState } from 'react';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

const BACKUP_CODES = [
  'A1B2-C3D4', 'E5F6-G7H8', 'I9J0-K1L2', 'M3N4-O5P6', 'Q7R8-S9T0',
  'U1V2-W3X4', 'Y5Z6-A7B8', 'C9D0-E1F2', 'G3H4-I5J6', 'K7L8-M9N0',
];

export function SettingsSecurityBackupCodes() {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Backup Codes" />
      <div className="card p-5 mb-3">
        <p className="mb-4 text-sm text-ink-muted">
          Use these codes to access your account if you lose your 2FA device.
          Each code can only be used once.
        </p>

        <div className="mb-4 rounded-lg border border-line bg-elevated p-4">
          <ul role="list" className="grid grid-cols-2 gap-1.5 list-none p-0 m-0">
            {BACKUP_CODES.map((code, i) => (
              <li
                key={i}
                aria-label={revealed ? code : 'Hidden backup code'}
                className="rounded bg-base px-2 py-1.5 text-center font-mono text-sm tabular-nums"
              >
                {revealed ? code : '•••••••••'}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-expanded={revealed}
            className="w-full rounded-lg border border-line py-2.5 text-sm font-semibold transition-colors hover:border-brand hover:text-brand"
          >
            {revealed ? 'Hide Codes' : 'Reveal Codes'}
          </button>
          <button
            type="button"
            disabled
            className="w-full rounded-lg border border-line py-2.5 text-sm font-semibold text-ink-muted opacity-50 cursor-not-allowed"
          >
            Download Codes
          </button>
          <button
            type="button"
            disabled
            className="w-full rounded-lg border border-down py-2.5 text-sm font-semibold text-down opacity-50 cursor-not-allowed"
          >
            Regenerate Codes
          </button>
        </div>
      </div>
      <p className="px-1 text-xs text-ink-muted">
        10 codes remaining. Store these somewhere safe — Meridian cannot recover
        them for you.
      </p>
    </div>
  );
}
