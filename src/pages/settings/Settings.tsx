import {
  Bell, DollarSign, Globe, Info, FileText, Lock,
  Shield, UserPen, LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { PageHeader } from '../../components/ui/PageHeader';

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English', fil: 'Filipino', es: 'Spanish', ja: '日本語',
  ko: '한국어', 'zh-Hans': '中文简体', 'zh-Hant': '中文繁體',
  fr: 'Français', de: 'Deutsch', pt: 'Português', ar: 'العربية', hi: 'हिन्दी',
};

function getInitials(name: string, email: string): string {
  return (name.trim() || email).charAt(0).toUpperCase();
}

function formatJoinDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function Settings() {
  const { user, signOut } = useAuth();
  const { currency, language, displayName } = useSettings();

  const initials = getInitials(displayName, user?.email ?? '');
  const joinDate = user?.created_at ? formatJoinDate(user.created_at) : '';

  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <PageHeader title="Settings" />

      {/* Profile card */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-extrabold text-white"
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{displayName || user?.email}</p>
            {joinDate && (
              <p className="text-sm text-ink-muted">Meridian member since {joinDate}</p>
            )}
          </div>
        </div>
      </div>

      {/* Preferences */}
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Preferences
      </p>
      <div className="card divide-y divide-line mb-6">
        <SettingsRow icon={Bell} label="Notifications" to="/settings/notifications" />
        <SettingsRow icon={DollarSign} label="Currency" value={currency} to="/settings/currency" />
        <SettingsRow
          icon={Globe}
          label="Language"
          value={LANGUAGE_LABELS[language] ?? language}
          to="/settings/language"
        />
      </div>

      {/* Legal */}
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Legal
      </p>
      <div className="card divide-y divide-line mb-6">
        <SettingsRow icon={Info} label="About Meridian" to="/settings/about" />
        <SettingsRow icon={FileText} label="Terms & Conditions" to="/settings/terms" />
        <SettingsRow icon={Lock} label="Privacy Policy" to="/settings/privacy" />
      </div>

      {/* Privacy */}
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Privacy
      </p>
      <div className="card divide-y divide-line mb-6">
        <SettingsRow icon={Shield} label="Privacy Settings" to="/settings/privacy-settings" />
      </div>

      {/* Account */}
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Account
      </p>
      <div className="card divide-y divide-line mb-6">
        <SettingsRow icon={UserPen} label="Edit Profile" to="/settings/profile" />
        <SettingsRow label="Deactivate Account" to="/settings/profile" danger />
      </div>

      {/* Sign out */}
      <button
        type="button"
        onClick={() => void signOut()}
        className="card flex w-full items-center justify-center gap-2 p-5 text-sm font-semibold text-down transition-colors hover:bg-down/5"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Sign Out
      </button>
    </div>
  );
}
