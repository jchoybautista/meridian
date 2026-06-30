import { useState } from 'react';
import { Smartphone, MessageSquare } from 'lucide-react';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

export function SettingsSecurity2FA() {
  const [codesRevealed, setCodesRevealed] = useState(false);

  const backupCodes = [
    'A1B2-C3D4', 'E5F6-G7H8', 'I9J0-K1L2', 'M3N4-O5P6', 'Q7R8-S9T0',
    'U1V2-W3X4', 'Y5Z6-A7B8', 'C9D0-E1F2', 'G3H4-I5J6', 'K7L8-M9N0',
  ];

  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Two-Factor Authentication" />

      <p className="mb-4 px-1 text-sm text-ink-muted">
        Add a second layer of security to your account. You'll be asked for a
        verification code each time you sign in.
      </p>

      {/* Authenticator App */}
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Authenticator App
      </p>
      <div className="card p-5 mb-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-ink-muted" aria-hidden="true" />
            <span className="text-sm font-semibold">TOTP Authenticator</span>
          </div>
          <span className="rounded-full bg-up/15 px-2 py-0.5 text-xs font-semibold text-up">
            Recommended
          </span>
        </div>

        {/* QR Code placeholder */}
        <div
          className="mb-4 flex h-36 w-36 items-center justify-center rounded-lg border-2 border-dashed border-line bg-elevated text-xs text-ink-muted"
          aria-label="QR code placeholder"
        >
          QR code
        </div>

        <p className="mb-3 text-xs text-ink-muted">
          Scan this QR code with your authenticator app (Google Authenticator,
          Authy, etc.), then enter the 6-digit code to verify.
        </p>

        <div>
          <label htmlFor="totp-code" className="mb-1 block text-sm font-medium">
            Verification Code
          </label>
          <div className="flex gap-2">
            <input
              id="totp-code"
              type="text"
              disabled
              placeholder="000 000"
              className="w-full rounded-lg border border-line bg-base px-3 py-2.5 text-center font-mono text-ink-muted outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="button"
              disabled
              className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white opacity-50 cursor-not-allowed whitespace-nowrap"
            >
              Verify
            </button>
          </div>
        </div>

        {/* Backup codes */}
        <div className="mt-4 border-t border-line pt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
              Backup Codes
            </p>
            <button
              type="button"
              onClick={() => setCodesRevealed((v) => !v)}
              aria-expanded={codesRevealed}
              className="text-xs font-medium text-brand hover:underline"
            >
              {codesRevealed ? 'Hide' : 'Reveal'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {backupCodes.map((code, i) => (
              <span
                key={i}
                aria-label={codesRevealed ? code : 'Hidden backup code'}
                className="rounded bg-elevated px-2 py-1 font-mono text-xs tabular-nums text-ink"
              >
                {codesRevealed ? code : '•••••••••'}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-ink-muted">
            Each code can only be used once. Store them somewhere safe.
          </p>
        </div>
      </div>

      {/* SMS option */}
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        SMS
      </p>
      <div className="card p-5 mb-3">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-ink-muted" aria-hidden="true" />
          <span className="text-sm font-semibold">Text Message</span>
        </div>
        <div>
          <label htmlFor="sms-number" className="mb-1 block text-sm font-medium">
            Phone Number
          </label>
          <input
            id="sms-number"
            type="tel"
            disabled
            placeholder="+1 (555) 000-0000"
            className="w-full rounded-lg border border-line bg-base px-3 py-2.5 text-ink-muted outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </div>
      <p className="px-1 text-xs text-ink-muted">
        SMS codes are less secure than an authenticator app. Use an authenticator
        app when possible.
      </p>
    </div>
  );
}
