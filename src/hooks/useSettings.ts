import { useState } from 'react';

export type Currency =
  | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'PHP' | 'AUD' | 'CAD' | 'CHF'
  | 'CNY' | 'HKD' | 'SGD' | 'KRW' | 'INR' | 'BRL' | 'MXN';

export type Language =
  | 'en' | 'fil' | 'es' | 'ja' | 'ko' | 'zh-Hans' | 'zh-Hant'
  | 'fr' | 'de' | 'pt' | 'ar' | 'hi';

export function readBool(key: string, def: boolean): boolean {
  const v = localStorage.getItem(key);
  return v === null ? def : v === 'true';
}

export function readString<T extends string>(key: string, def: T): T {
  return (localStorage.getItem(key) as T | null) ?? def;
}

function writeBool(key: string, v: boolean) {
  localStorage.setItem(key, String(v));
}

function writeString(key: string, v: string) {
  localStorage.setItem(key, v);
}

export function useSettings() {
  const [currency, setCurrencyState] = useState<Currency>(
    () => readString('meridian_currency', 'USD'),
  );
  const [language, setLanguageState] = useState<Language>(
    () => readString('meridian_language', 'en'),
  );
  const [notifEmail, setNotifEmailState] = useState(
    () => readBool('meridian_notif_email', true),
  );
  const [notifWeekly, setNotifWeeklyState] = useState(
    () => readBool('meridian_notif_weekly', true),
  );
  const [analytics, setAnalyticsState] = useState(
    () => readBool('meridian_analytics', true),
  );
  const [marketing, setMarketingState] = useState(
    () => readBool('meridian_marketing', false),
  );
  const [displayName, setDisplayNameState] = useState(
    () => readString('meridian_display_name', ''),
  );

  return {
    currency,
    setCurrency: (v: Currency) => { writeString('meridian_currency', v); setCurrencyState(v); },
    language,
    setLanguage: (v: Language) => { writeString('meridian_language', v); setLanguageState(v); },
    notifEmail,
    setNotifEmail: (v: boolean) => { writeBool('meridian_notif_email', v); setNotifEmailState(v); },
    notifWeekly,
    setNotifWeekly: (v: boolean) => { writeBool('meridian_notif_weekly', v); setNotifWeeklyState(v); },
    analytics,
    setAnalytics: (v: boolean) => { writeBool('meridian_analytics', v); setAnalyticsState(v); },
    marketing,
    setMarketing: (v: boolean) => { writeBool('meridian_marketing', v); setMarketingState(v); },
    displayName,
    setDisplayName: (v: string) => { writeString('meridian_display_name', v); setDisplayNameState(v); },
  };
}
