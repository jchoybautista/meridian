import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

export function SettingsSecurityChangePassword() {
  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Change Password" />
      <div className="card p-5 mb-3">
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="current-password" className="mb-1 block text-sm font-medium">
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              disabled
              placeholder="••••••••"
              className="w-full rounded-lg border border-line bg-base px-3 py-2.5 text-ink-muted outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              disabled
              placeholder="••••••••"
              className="w-full rounded-lg border border-line bg-base px-3 py-2.5 text-ink-muted outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              disabled
              placeholder="••••••••"
              className="w-full rounded-lg border border-line bg-base px-3 py-2.5 text-ink-muted outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled
            className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white opacity-50 cursor-not-allowed"
          >
            Update Password
          </button>
        </form>
      </div>
      <p className="px-1 text-xs text-ink-muted">
        For your security, you'll be signed out of all other devices after changing your password.
      </p>
    </div>
  );
}
