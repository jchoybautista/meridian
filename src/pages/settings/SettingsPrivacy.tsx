import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'We collect your email address for authentication purposes and your paper trading data (wallet balance, orders, portfolio transactions). Preferences such as currency and language are stored locally on your device and never transmitted to our servers. If analytics are enabled, we collect anonymized usage patterns.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'Your information is used to authenticate your account, maintain your paper trading history, improve platform features based on anonymized usage data, and send product updates if you have opted in.',
  },
  {
    title: '3. Data Storage',
    body: 'Your account data is stored securely via Supabase, hosted in the United States. Supabase employs industry-standard encryption for data in transit (TLS) and at rest (AES-256). Preference data is stored in your browser\'s localStorage and never leaves your device.',
  },
  {
    title: '4. Cookies and Local Storage',
    body: 'Meridian uses your browser\'s localStorage to store display preferences (currency, language, notification settings). We do not use tracking cookies or third-party advertising networks.',
  },
  {
    title: '5. Third-Party Services',
    body: 'To provide market data, Meridian integrates with CoinGecko, Binance, Finnhub, Alpha Vantage, Twelve Data, and mempool.space. These services may log requests made from your browser. Please review their respective privacy policies for more information.',
  },
  {
    title: '6. Your Rights',
    body: 'You may request the deletion of your account and all associated personal data by contacting us at privacy@meridian.app. We will process requests within 30 days. You may also export your portfolio data at any time from the Portfolio page.',
  },
  {
    title: '7. Contact',
    body: 'For privacy-related inquiries, contact us at privacy@meridian.app.',
  },
];

export function SettingsPrivacy() {
  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Privacy Policy" />
      <div className="card p-5">
        <p className="mb-5 text-xs text-ink-muted">Last updated: June 2026</p>
        <div className="space-y-5">
          {SECTIONS.map(({ title, body }) => (
            <section key={title}>
              <h2 className="mb-1.5 text-sm font-bold">{title}</h2>
              <p className="text-sm leading-relaxed text-ink-muted">{body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
