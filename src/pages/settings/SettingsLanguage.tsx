import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings, type Language } from '../../hooks/useSettings';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

const LANGUAGES: { code: Language; label: string; native?: string }[] = [
  { code: 'en',      label: 'English' },
  { code: 'fil',     label: 'Filipino' },
  { code: 'es',      label: 'Spanish',             native: 'Español' },
  { code: 'ja',      label: 'Japanese',            native: '日本語' },
  { code: 'ko',      label: 'Korean',              native: '한국어' },
  { code: 'zh-Hans', label: 'Chinese Simplified',  native: '中文简体' },
  { code: 'zh-Hant', label: 'Chinese Traditional', native: '中文繁體' },
  { code: 'fr',      label: 'French',              native: 'Français' },
  { code: 'de',      label: 'German',              native: 'Deutsch' },
  { code: 'pt',      label: 'Portuguese',          native: 'Português' },
  { code: 'ar',      label: 'Arabic',              native: 'العربية' },
  { code: 'hi',      label: 'Hindi',               native: 'हिन्दी' },
];

export function SettingsLanguage() {
  const { language, setLanguage } = useSettings();
  const navigate = useNavigate();

  const handleSelect = (code: Language) => {
    setLanguage(code);
    navigate(-1);
  };

  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Language" />
      <div className="card divide-y divide-line mb-3">
        {LANGUAGES.map(({ code, label, native }) => (
          <button
            key={code}
            type="button"
            onClick={() => handleSelect(code)}
            className="flex w-full min-h-[48px] items-center justify-between px-5 py-3 transition-colors hover:bg-elevated"
            aria-pressed={language === code}
          >
            <div className="text-left">
              <span className="block text-sm font-semibold">{native ?? label}</span>
              {native && <span className="text-xs text-ink-muted">{label}</span>}
            </div>
            {language === code && (
              <Check className="h-4 w-4 text-brand" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
      <p className="px-1 text-xs text-ink-muted">
        Full translation coming soon. UI remains in English.
      </p>
    </div>
  );
}
