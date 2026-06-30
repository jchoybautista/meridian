import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ImageIcon, Loader2, X, Circle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

function getInitials(name: string, email: string): string {
  return (name.trim() || email).charAt(0).toUpperCase();
}

// ─── Camera modal ──────────────────────────────────────────────────────────────

function CameraModal({
  onCapture,
  onClose,
}: {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => { if (mounted) setReady(true); };
        }
      })
      .catch(() => {
        if (mounted) setError('Camera access denied or unavailable on this device.');
      });

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !ready) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          streamRef.current?.getTracks().forEach((t) => t.stop());
          onCapture(blob);
        }
      },
      'image/jpeg',
      0.88,
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base/90 backdrop-blur-sm"
      tabIndex={-1}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div
        className="card mx-4 w-full max-w-sm overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Take a photo"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <h3 className="font-bold">Take Photo</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close camera"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-elevated hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {error ? (
          <div className="p-5 pt-0">
            <p className="text-sm text-down" role="alert">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-lg border border-line py-2 text-sm font-semibold"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Video preview */}
            <div className="relative bg-black">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full"
                aria-label="Camera preview"
              />
              {!ready && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white" aria-label="Starting camera" />
                </div>
              )}
            </div>

            {/* Capture button */}
            <div className="flex justify-center p-5">
              <button
                type="button"
                onClick={capture}
                disabled={!ready}
                aria-label="Capture photo"
                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-40"
              >
                <Circle className="h-10 w-10 fill-white text-white" aria-hidden="true" />
              </button>
            </div>
          </>
        )}

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      </div>
    </div>
  );
}

// ─── Deactivate modal ──────────────────────────────────────────────────────────

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

// ─── Profile page ──────────────────────────────────────────────────────────────

export function SettingsProfile() {
  const { user, signOut } = useAuth();
  const { displayName, setDisplayName } = useSettings();
  const navigate = useNavigate();

  const storedAvatar = user ? localStorage.getItem(`meridian_avatar_${user.id}`) : null;

  const [nameInput, setNameInput] = useState<string>(displayName);
  const [saved, setSaved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(storedAvatar);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const galleryInputRef = useRef<HTMLInputElement>(null);
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

  const uploadFile = async (file: File | Blob) => {
    if (!user) return;
    setUploadError(null);
    setUploading(true);

    try {
      const fileObj = file instanceof File ? file : new File([file], 'avatar.jpg', { type: 'image/jpeg' });

      if (isSupabaseConfigured && supabase) {
        const path = `${user.id}/avatar`;
        const { error } = await supabase.storage
          .from('avatars')
          .upload(path, fileObj, { upsert: true, contentType: fileObj.type });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(path);

        const bustedUrl = `${publicUrl}?t=${Date.now()}`;
        localStorage.setItem(`meridian_avatar_${user.id}`, bustedUrl);
        setAvatarUrl(bustedUrl);
      } else {
        // Supabase not configured — store as data URL in localStorage
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            localStorage.setItem(`meridian_avatar_${user.id}`, dataUrl);
            setAvatarUrl(dataUrl);
            resolve();
          };
          reader.readAsDataURL(fileObj);
        });
      }
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void uploadFile(file);
  };

  const handleCameraCapture = (blob: Blob) => {
    setShowCamera(false);
    void uploadFile(blob);
  };

  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Profile" />

      {/* Edit profile card */}
      <div className="card p-5 mb-6">

        {/* Avatar */}
        <div className="mb-5 flex flex-col items-center gap-3">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Your profile photo"
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full bg-brand text-4xl font-extrabold text-white"
                aria-hidden="true"
              >
                {initials}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-base/60">
                <Loader2 className="h-6 w-6 animate-spin text-white" aria-label="Uploading photo" />
              </div>
            )}
          </div>

          {/* Photo buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => setShowCamera(true)}
              className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-brand hover:text-ink disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
              Take Photo
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => galleryInputRef.current?.click()}
              className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-brand hover:text-ink disabled:opacity-50"
            >
              <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Upload from Gallery
            </button>
          </div>

          {uploadError && (
            <p role="alert" className="text-xs text-down">{uploadError}</p>
          )}

          {/* Hidden gallery file input */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            onChange={handleGalleryChange}
          />
        </div>

        {/* Display name + email */}
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

      {/* Danger zone */}
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Danger Zone
      </p>
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

      {showCamera && (
        <CameraModal
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {showModal && (
        <DeactivateModal
          onClose={() => setShowModal(false)}
          onConfirm={() => void handleDeactivate()}
        />
      )}
    </div>
  );
}
