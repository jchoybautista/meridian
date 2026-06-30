import { CheckCircle, XCircle } from 'lucide-react';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

type ActivityStatus = 'success' | 'failed';

interface ActivityEntry {
  id: number;
  datetime: string;
  device: string;
  location: string;
  status: ActivityStatus;
}

const ACTIVITY: ActivityEntry[] = [
  { id: 1, datetime: 'Today, 9:14 AM', device: 'Chrome · macOS', location: 'Manila, PH', status: 'success' },
  { id: 2, datetime: 'Yesterday, 11:02 PM', device: 'Safari · iPhone', location: 'Manila, PH', status: 'success' },
  { id: 3, datetime: 'Jun 28, 3:45 PM', device: 'Firefox · Windows', location: 'Unknown', status: 'failed' },
  { id: 4, datetime: 'Jun 27, 8:21 AM', device: 'Chrome · macOS', location: 'Manila, PH', status: 'success' },
  { id: 5, datetime: 'Jun 26, 6:00 PM', device: 'Chrome · macOS', location: 'Manila, PH', status: 'success' },
];

export function SettingsSecurityLoginActivity() {
  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Login Activity" />
      <div className="card overflow-hidden mb-3">
        <table className="w-full text-sm" aria-label="Login activity log">
          <thead>
            <tr className="border-b border-line bg-elevated">
              <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Date / Device
              </th>
              <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ACTIVITY.map(({ id, datetime, device, location, status }) => (
              <tr key={id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{datetime}</p>
                  <p className="text-xs text-ink-muted">
                    {device} · {location}
                  </p>
                </td>
                <td className="px-4 py-3 text-right">
                  {status === 'success' ? (
                    <span className="inline-flex items-center gap-1 text-up">
                      <CheckCircle className="h-4 w-4" aria-hidden="true" />
                      <span className="text-xs font-semibold">Success</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-down">
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      <span className="text-xs font-semibold">Failed</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-1 text-xs text-ink-muted">
        Showing the last 5 sign-in attempts. If you see unrecognized activity,
        change your password immediately.
      </p>
    </div>
  );
}
