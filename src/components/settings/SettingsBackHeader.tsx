import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SettingsBackHeader({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <div className="mb-6 flex items-center gap-3">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Back to Settings"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-elevated hover:text-ink"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
    </div>
  );
}
