import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

function getInitials(name: string, email: string): string {
  return (name.trim() || email).charAt(0).toUpperCase();
}

function DeactivateModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm"
      tabIndex={-1}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div
        className="card mx-4 w-full max-w-sm p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deactivate-title"
      >
        <h3 id="deactivate-title" className="mb-2 text-base font-bold">
          Deactivate Account?
        </h3>
        <p className="mb-5 text-sm text-ink-muted">
          This will sign you out immediately. Your data will be retained unless you contact support.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-line py-2 text-sm font-semibold transition-colors hover:border-brand"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-down py-2 text-sm font-bold text-white transition-colors hover:bg-down/80"
          >
            Yes, deactivate
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsProfile() {
  const { user, signOut } = useAuth();
  const { displayName, setDisplayName } = useSettings();
  const navigate = useNavigate();

  const [nameInput, setNameInput] = useState(displayName);
  const [saved, setSaved] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const initials = getInitials(nameInput, user?.email ?? '');

  const handleSave = () => {
    setDisplayName(nameInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeactivate = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Profile" />

      {/* Edit profile card */}
      <div className="card p-5 mb-6">
        <div className="mb-5 flex justify-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-3xl font-extrabold text-white"
            aria-hidden="true"
          >
            {initials}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="display-name" className="mb-1 block text-xs font-medium text-ink-muted">
              Display Name
            </label>
            <input
              id="display-name"
              type="text"
              value={nameInput}
              onChange={(e) => { setNameInput(e.target.value); setSaved(false); }}
              placeholder="Your name"
              maxLength={64}
              className="w-full rounded-md border border-line bg-elevated px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="profile-email" className="mb-1 block text-xs font-medium text-ink-muted">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              value={user?.email ?? ''}
              readOnly
              className="w-full cursor-default rounded-md border border-line bg-elevated px-3 py-2 text-sm text-ink-muted"
              aria-describedby="email-note"
            />
            <p id="email-note" className="mt-1 text-xs text-ink-muted">
              Email cannot be changed here.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-lg bg-brand py-2 text-sm font-bold text-white transition-colors hover:bg-brand/80"
        >
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {/* Danger zone label */}
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Danger Zone
      </p>

      {/* Danger zone card */}
      <div className="card p-5" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
        <h2 className="mb-1 text-sm font-bold text-down">Deactivate Account</h2>
        <p className="mb-4 text-sm text-ink-muted">
          Deactivating will sign you out immediately. Your data is retained unless you contact support.
        </p>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex min-h-[44px] items-center justify-center rounded-lg border border-down/50 px-4 py-2 text-sm font-semibold text-down transition-colors hover:bg-down/10"
        >
          Deactivate Account
        </button>
      </div>

      {showModal && (
        <DeactivateModal
          onClose={() => setShowModal(false)}
          onConfirm={() => void handleDeactivate()}
        />
      )}
    </div>
  );
}
