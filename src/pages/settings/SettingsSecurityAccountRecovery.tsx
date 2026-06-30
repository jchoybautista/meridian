import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

export function SettingsSecurityAccountRecovery() {
  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Account Recovery" />
      <p className="mb-4 px-1 text-sm text-ink-muted">
        These options are used to verify your identity if you lose access to
        your account.
      </p>

      <div className="card divide-y divide-line mb-3">
        {/* Recovery Email */}
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-sm font-medium">Recovery Email</p>
            <p className="mt-0.5 text-xs text-ink-muted">j***@gmail.com</p>
          </div>
          <button
            type="button"
            disabled
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted opacity-50 cursor-not-allowed"
          >
            Update
          </button>
        </div>

        {/* Recovery Phone */}
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-sm font-medium">Recovery Phone</p>
            <p className="mt-0.5 text-xs text-ink-muted">Not set</p>
          </div>
          <button
            type="button"
            disabled
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted opacity-50 cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </div>

      <p className="px-1 text-xs text-ink-muted">
        A recovery email or phone lets Meridian verify your identity and
        restore account access if you're locked out.
      </p>
    </div>
  );
}
