import { useSettings } from '../../hooks/useSettings';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';
import { SettingsToggle } from '../../components/settings/SettingsToggle';

export function SettingsPrivacySettings() {
  const { analytics, setAnalytics, marketing, setMarketing } = useSettings();

  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Privacy Settings" />
      <div className="card divide-y divide-line mb-3">
        <SettingsToggle
          label="Usage Analytics"
          description="Help us improve Meridian by sharing anonymous usage data"
          checked={analytics}
          onChange={setAnalytics}
        />
        <SettingsToggle
          label="Marketing Emails"
          description="Receive product news and feature announcements"
          checked={marketing}
          onChange={setMarketing}
        />
      </div>
      <p className="px-1 text-xs text-ink-muted">
        Functional data (authentication, paper trading) is always stored and cannot be disabled.
      </p>
    </div>
  );
}
