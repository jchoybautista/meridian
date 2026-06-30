import { useId } from 'react';

interface Props {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function SettingsToggle({ label, description, checked, onChange }: Props) {
  const id = useId();
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-4 px-5 py-3">
      <div>
        <label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {label}
        </label>
        <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-base ${
          checked ? 'bg-brand' : 'bg-elevated'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
