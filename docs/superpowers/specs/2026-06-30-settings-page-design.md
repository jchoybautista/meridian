# Settings Page — Design Spec
Date: 2026-06-30

## Overview

Add a full Settings section to Meridian. Users can manage their profile, configure display preferences (currency, language, notifications), view legal content, and deactivate their account. Preferences persist via localStorage; no new Supabase tables required.

---

## Routes

All routes require authentication (wrapped in `AuthGuard`).

| Route | Component | Description |
|-------|-----------|-------------|
| `/settings` | `Settings` | Hub list page |
| `/settings/profile` | `SettingsProfile` | Edit display name + deactivate account |
| `/settings/notifications` | `SettingsNotifications` | Notification preference toggles |
| `/settings/currency` | `SettingsCurrency` | Currency preference radio list |
| `/settings/language` | `SettingsLanguage` | Language preference radio list |
| `/settings/about` | `SettingsAbout` | About Meridian (static) |
| `/settings/terms` | `SettingsTerms` | Terms & Conditions (static) |
| `/settings/privacy` | `SettingsPrivacy` | Privacy Policy (static) |
| `/settings/privacy-settings` | `SettingsPrivacySettings` | Privacy toggle switches |

All sub-pages live in `src/pages/settings/`.

---

## Navigation

- **Sidebar (desktop):** Add `Settings` as the last item in `NAV_ITEMS` using the `Settings` icon from lucide-react. Protected route.
- **BottomNav (mobile):** Same `NAV_ITEMS` drives the bottom nav; Settings appears as the 8th tab. 8 items at ~47px each fits on 375px+ screens.

---

## localStorage Keys

| Key | Values | Default |
|-----|--------|---------|
| `meridian_currency` | `USD \| EUR \| GBP \| JPY \| PHP \| AUD \| CAD \| CHF \| CNY \| HKD \| SGD \| KRW \| INR \| BRL \| MXN` | `USD` |
| `meridian_language` | `en \| fil \| es \| ja \| ko \| zh-Hans \| zh-Hant \| fr \| de \| pt \| ar \| hi` | `en` |
| `meridian_notif_email` | `true \| false` | `true` |
| `meridian_notif_weekly` | `true \| false` | `true` |
| `meridian_analytics` | `true \| false` | `true` |
| `meridian_marketing` | `true \| false` | `false` |
| `meridian_display_name` | string | `""` |

A single `useSettings` hook reads/writes all keys and exposes typed values + setters.

---

## Hub Page (`/settings`)

Layout: `PageHeader` with title "Settings", then grouped `card p-5` sections separated by small-caps section labels.

### Profile Card (top, no chevron)
- Avatar circle: large initial from display name or email, brand-colored background
- Display name (if set) or email address as primary text
- "Meridian member since [join date]" as secondary text (from `user.created_at`)

### Sections

**Preferences**
- Notifications → `/settings/notifications`
- Currency → `/settings/currency` (current value shown right: e.g. "USD")
- Language → `/settings/language` (current value shown right: e.g. "English")

**Legal**
- About Meridian → `/settings/about`
- Terms & Conditions → `/settings/terms`
- Privacy Policy → `/settings/privacy`

**Privacy**
- Privacy Settings → `/settings/privacy-settings`

**Account**
- Edit Profile → `/settings/profile`
- Deactivate Account → `/settings/profile` (red text, no icon — deactivate section is always visible at the bottom of that page)

**Bottom**
- Full-width "Sign Out" button (calls `signOut()` from `AuthContext`)

### Row anatomy
Each settings row is a `<button>` or `<Link>` spanning full width:
```
[Icon]  Label text          Current value (muted)  [ChevronRight]
```
Minimum touch target: 48px height. Dividers between rows within the same card.

---

## Sub-pages

### Profile (`/settings/profile`)

**Edit Profile section:**
- Large avatar circle (64px) showing initials, brand background
- Display name input (`meridian_display_name`, saved on change)
- Email field (read-only, from `user.email`)
- "Save" button — writes to localStorage, shows inline success message

**Danger Zone section** (below, separated):
- Red-outlined card with "Deactivate Account" heading
- Warning copy: "This will sign you out immediately. Your data will be retained unless you contact support."
- "Deactivate" button → opens confirmation modal
- Modal: "Are you sure?" + "Cancel" + "Yes, deactivate" (red) → calls `signOut()` + navigate to `/`

### Notifications (`/settings/notifications`)

Toggle list inside a `card p-5`:
- **Email Notifications** — "Receive updates and alerts via email" — toggle (`meridian_notif_email`)
- **Weekly Digest** — "A weekly summary of your portfolio and market highlights" — toggle (`meridian_notif_weekly`)

Note copy at bottom: "Push notifications are not yet available on web."

### Currency (`/settings/currency`)

Radio list inside a `card p-5`. Each row: currency code (bold) + full name (muted) + checkmark on selected. Tapping saves immediately to localStorage and returns to hub via `navigate(-1)`.

Full list (15 options):
USD, EUR, GBP, JPY, PHP, AUD, CAD, CHF, CNY, HKD, SGD, KRW, INR, BRL, MXN

### Language (`/settings/language`)

Same radio-list pattern. 12 options:

| Code | Label |
|------|-------|
| en | English |
| fil | Filipino |
| es | Spanish |
| ja | 日本語 (Japanese) |
| ko | 한국어 (Korean) |
| zh-Hans | 中文简体 (Chinese Simplified) |
| zh-Hant | 中文繁體 (Chinese Traditional) |
| fr | Français (French) |
| de | Deutsch (German) |
| pt | Português (Portuguese) |
| ar | العربية (Arabic) |
| hi | हिन्दी (Hindi) |

Note: Language preference is stored but UI remains in English (full i18n is out of scope for this spec). A note explains: "Full translation coming soon."

### About Meridian (`/settings/about`)

Static content card:
- App name + version (hardcoded `v1.0.0`)
- Tagline: "Track every market in one place."
- Description paragraph (2–3 sentences about what Meridian is)
- Data sources section: CoinGecko, Binance, Finnhub, Alpha Vantage, Twelve Data, mempool.space
- Built with: React, Supabase, Tailwind CSS
- Copyright line: "© 2026 Meridian. All rights reserved."

### Terms & Conditions (`/settings/terms`)

Static content card with the following sections (made-up, Meridian-specific):
1. Acceptance of Terms
2. Use of the Platform (paper trading only, no real money)
3. Account Responsibilities
4. Intellectual Property
5. Disclaimer of Warranties
6. Limitation of Liability
7. Changes to Terms
8. Contact

### Privacy Policy (`/settings/privacy`)

Static content card with sections:
1. Information We Collect (email, usage data)
2. How We Use Your Information
3. Data Storage (Supabase, US region)
4. Cookies and Local Storage
5. Third-Party Services (CoinGecko, Binance APIs, etc.)
6. Your Rights
7. Contact

### Privacy Settings (`/settings/privacy-settings`)

Toggle list inside a `card p-5`:
- **Usage Analytics** — "Help us improve Meridian by sharing anonymous usage data" — toggle (`meridian_analytics`)
- **Marketing Emails** — "Receive product news and feature announcements" — toggle (`meridian_marketing`)

Note: "Functional data (authentication, paper trading) is always stored and cannot be disabled."

---

## Shared Components

### `useSettings` hook (`src/hooks/useSettings.ts`)
Reads all localStorage keys on mount, exposes typed state + individual setters. Setters write synchronously to localStorage. No async, no Supabase.

### `SettingsRow` component (`src/components/settings/SettingsRow.tsx`)
Reusable row for the hub: accepts `icon`, `label`, `value` (optional), `to` (link) or `onClick`. Renders a full-width, min-48px-height interactive row with chevron.

### `SettingsToggle` component (`src/components/settings/SettingsToggle.tsx`)
Label + description + toggle switch. Accessible: `role="switch"`, `aria-checked`.

### `SettingsBackHeader` component (`src/components/settings/SettingsBackHeader.tsx`)
Sub-page header: back arrow (`navigate(-1)`) + page title. Replaces `PageHeader` on sub-pages.

---

## Styling

- All cards: `card p-5` (consistent with global standard)
- Section labels: `text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2`
- Row dividers: `divide-y divide-line` on the card
- Selected radio item: brand color checkmark + `text-brand` label
- Danger zone card: `border-down/40` border, `text-down` heading
- Toggle: custom CSS switch or a simple `<button role="switch">` styled with brand/elevated colors

---

## Accessibility

- All interactive rows are `<button>` or `<Link>` (no div-buttons)
- Toggle switches use `role="switch"` and `aria-checked`
- Back button has `aria-label="Back to Settings"`
- Confirmation modal uses `role="dialog"` + `aria-modal="true"` + focus trap
- Min touch target 48×48px on all rows and toggles

---

## Out of Scope

- Actual i18n/translation of UI strings
- Push notification infrastructure
- Real account deletion (requires Supabase admin privileges; we sign out instead)
- Profile photo upload
