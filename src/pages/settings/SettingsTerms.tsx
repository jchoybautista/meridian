import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using Meridian, you agree to be bound by these Terms & Conditions. If you do not agree with any part of these Terms, please discontinue use of the platform immediately.',
  },
  {
    title: '2. Use of the Platform',
    body: 'Meridian provides real-time market data and paper trading simulations for informational and educational purposes only. No real money is involved in any trading activity. All balances, orders, and portfolio data are entirely simulated. Meridian is not a licensed broker or financial advisor.',
  },
  {
    title: '3. Account Responsibilities',
    body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized access or security breach.',
  },
  {
    title: '4. Intellectual Property',
    body: 'All content, designs, code, and trademarks on Meridian are the exclusive property of Meridian and its licensors. You may not reproduce, distribute, modify, or create derivative works without prior written permission.',
  },
  {
    title: '5. Disclaimer of Warranties',
    body: 'Market data is provided as-is, without guarantee of accuracy, completeness, or timeliness. Third-party data providers may experience outages or delays. Meridian makes no warranty that the platform will be uninterrupted or error-free.',
  },
  {
    title: '6. Limitation of Liability',
    body: 'To the fullest extent permitted by applicable law, Meridian shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from your use of the platform or reliance on any market data displayed.',
  },
  {
    title: '7. Changes to Terms',
    body: 'We reserve the right to modify these Terms at any time. Changes will be posted on this page. Continued use of Meridian after changes are posted constitutes your acceptance of the updated Terms.',
  },
  {
    title: '8. Contact',
    body: 'For questions about these Terms & Conditions, please contact us at legal@meridian.app.',
  },
];

export function SettingsTerms() {
  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Terms & Conditions" />
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
