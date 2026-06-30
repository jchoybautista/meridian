import { useState } from 'react';
import {
  KeyRound, Key, Monitor, ShieldCheck,
  Activity, Timer, LifeBuoy, Mail,
} from 'lucide-react';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { SettingsToggle } from '../../components/settings/SettingsToggle';

export function SettingsSecurity() {
  const [biometric, setBiometric] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Security" />

      {/* Authentication */}
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Authentication
      </p>
      <div className="card divide-y divide-line mb-6">
        <SettingsRow
          icon={KeyRound}
          label="Change Password"
          to="/settings/security/change-password"
        />
        <SettingsRow
          icon={ShieldCheck}
          label="Two-Factor Authentication"
          value="Off"
          to="/settings/security/2fa"
        />
        <SettingsToggle
          label="Biometric Login"
          description="Use Face ID or fingerprint to sign in"
          checked={biometric}
          onChange={setBiometric}
        />
        <SettingsRow
          icon={Key}
          label="Passkeys"
          value="None added"
          to="/settings/security/passkeys"
        />
      </div>

      {/* Sessions & Devices */}
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Sessions & Devices
      </p>
      <div className="card divide-y divide-line mb-6">
        <SettingsRow
          icon={Monitor}
          label="Active Sessions"
          value="1 device"
          to="/settings/security/sessions"
        />
        <SettingsRow
          icon={ShieldCheck}
          label="Trusted Devices"
          value="0 trusted"
          to="/settings/security/trusted-devices"
        />
      </div>

      {/* Monitoring */}
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Monitoring
      </p>
      <div className="card divide-y divide-line mb-6">
        <SettingsRow
          icon={Activity}
          label="Login Activity"
          to="/settings/security/login-activity"
        />
        <SettingsToggle
          label="Security Alerts"
          description="Email me on new sign-in from an unrecognized device"
          checked={securityAlerts}
          onChange={setSecurityAlerts}
        />
        <div className="flex min-h-[48px] items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <Timer className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
            <span className="text-sm font-medium text-ink">Auto-lock After Inactivity</span>
          </div>
          <span className="text-sm text-ink-muted">15 min</span>
        </div>
      </div>

      {/* Recovery */}
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Recovery
      </p>
      <div className="card divide-y divide-line mb-6">
        <SettingsRow
          icon={Key}
          label="Backup Codes"
          value="10 remaining"
          to="/settings/security/backup-codes"
        />
        <div className="flex min-h-[48px] items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
            <span className="text-sm font-medium text-ink">Recovery Email</span>
          </div>
          <span className="text-sm text-ink-muted">j***@gmail.com</span>
        </div>
        <SettingsRow
          icon={LifeBuoy}
          label="Account Recovery"
          to="/settings/security/account-recovery"
        />
      </div>
    </div>
  );
}
