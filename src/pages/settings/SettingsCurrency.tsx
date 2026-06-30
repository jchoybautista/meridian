import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings, type Currency } from '../../hooks/useSettings';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

const CURRENCIES: { code: Currency; name: string }[] = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'MXN', name: 'Mexican Peso' },
];

export function SettingsCurrency() {
  const { currency, setCurrency } = useSettings();
  const navigate = useNavigate();

  const handleSelect = (code: Currency) => {
    setCurrency(code);
    navigate(-1);
  };

  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Currency" />
      <div className="card divide-y divide-line">
        {CURRENCIES.map(({ code, name }) => (
          <button
            key={code}
            type="button"
            onClick={() => handleSelect(code)}
            className="flex w-full min-h-[48px] items-center justify-between px-5 py-3 transition-colors hover:bg-elevated"
            aria-pressed={currency === code}
          >
            <div className="text-left">
              <span className="block text-sm font-semibold">{code}</span>
              <span className="text-xs text-ink-muted">{name}</span>
            </div>
            {currency === code && (
              <Check className="h-4 w-4 text-brand" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
