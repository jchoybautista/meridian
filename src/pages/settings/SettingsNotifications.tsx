import { useSettings } from '../../hooks/useSettings';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';
import { SettingsToggle } from '../../components/settings/SettingsToggle';

export function SettingsNotifications() {
  const { notifEmail, setNotifEmail, notifWeekly, setNotifWeekly } = useSettings();

  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Notifications" />
      <div className="card divide-y divide-line">
        <SettingsToggle
          label="Email Notifications"
          description="Receive updates and alerts via email"
          checked={notifEmail}
          onChange={setNotifEmail}
        />
        <SettingsToggle
          label="Weekly Digest"
          description="A weekly summary of your portfolio and market highlights"
          checked={notifWeekly}
          onChange={setNotifWeekly}
        />
      </div>
      <p className="mt-3 px-1 text-xs text-ink-muted">
        Push notifications are not yet available on web.
      </p>
    </div>
  );
}
