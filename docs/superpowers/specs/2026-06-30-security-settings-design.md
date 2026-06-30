# Security Settings & Sign-in Enhancements — Design Spec
Date: 2026-06-30

## Scope

Three deliverables:
1. Add "Forgot password?" and "Remember me" to the sign-in form (display-only UI, no backend wiring)
2. Add a Security section to Settings hub + a full `/settings/security` page with finance-grade security controls (display-only)
3. Fix trade card padding consistency (`p-3` → `p-4`)

Everything marked "display-only" renders static/mocked UI. No Supabase calls, no real auth flows.

---

## 1. Sign-in Form Additions (`AuthForm.tsx`)

Login mode only (no changes to registration mode).

### Forgot Password
- Inline link placed on the same row as the Password label, right-aligned: `Forgot password?`
- Routes to `/forgot-password`
- A new `ForgotPassword.tsx` page (standalone, same layout as Login): one email field + "Send reset link" button + static success state ("If an account exists, you'll receive an email.")
- Route added in `App.tsx`

### Remember Me
- Checkbox + label placed between the password field and the submit button
- Label: "Remember me"
- State stored in component only (no wiring); `autoComplete="on"` already handles browser-level remember
- WCAG: `<label>` wraps the checkbox so it is keyboard and screen-reader accessible

---

## 2. Security Settings

### 2a. Settings Hub (`Settings.tsx`)

Add a new **Security** section between Account and Preferences:

```
Security
┌─────────────────────────────────────────────┐
│ 🔒 Security   (shield icon)             →   │
└─────────────────────────────────────────────┘
```

Single `SettingsRow` pointing to `/settings/security`. Shown for both authenticated and unauthenticated users (unauthenticated users land on the security page and see a sign-in prompt where applicable).

### 2b. Security Hub Page (`SettingsSecurity.tsx`) — `/settings/security`

Follows the same section/card pattern as `Settings.tsx`. All items use `SettingsRow` (with `→` chevron) or `SettingsToggle` as appropriate.

#### Authentication
Section label: "Authentication"
| Control | Type | Value/Description |
|---|---|---|
| Change Password | SettingsRow → `/settings/security/change-password` | — |
| Two-Factor Authentication | SettingsRow → `/settings/security/2fa` | value: "Off" |
| Biometric Login | SettingsToggle | "Use Face ID or fingerprint to sign in" |
| Passkeys | SettingsRow → `/settings/security/passkeys` | value: "None added" |

#### Sessions & Devices
Section label: "Sessions & Devices"
| Control | Type | Value/Description |
|---|---|---|
| Active Sessions | SettingsRow → `/settings/security/sessions` | value: "1 device" |
| Trusted Devices | SettingsRow → `/settings/security/trusted-devices` | value: "0 trusted" |

#### Monitoring
Section label: "Monitoring"
| Control | Type | Value/Description |
|---|---|---|
| Login Activity | SettingsRow → `/settings/security/login-activity` | — |
| Security Alerts | SettingsToggle | "Email me on new sign-in from unrecognized device" |
| Auto-lock After Inactivity | SettingsRow | value: "15 min" (no sub-page, tappable but no nav) |

#### Recovery
Section label: "Recovery"
| Control | Type | Value/Description |
|---|---|---|
| Backup Codes | SettingsRow → `/settings/security/backup-codes` | value: "10 remaining" |
| Recovery Email | SettingsRow | value: masked address e.g. "j***@gmail.com" |
| Account Recovery | SettingsRow → `/settings/security/account-recovery` | — |

---

### 2c. Sub-Pages

All sub-pages use `SettingsBackHeader` for the back button + title.

#### Change Password (`SettingsSecurityChangePassword.tsx`)
Static form with three fields: Current Password, New Password, Confirm New Password.
Submit button "Update Password" — disabled, no action.
Note below: "For your security, you'll be signed out of all other devices."

#### Two-Factor Authentication (`SettingsSecurity2FA.tsx`)
Two-option display:
- **Authenticator App** (recommended badge) — shows a placeholder QR code box (gray square with "QR code" label), and 10 masked backup codes in a monospace grid with a "Reveal" button (toggles `•••••••••` ↔ code display visually)
- **SMS** — shows a phone number entry field (disabled, placeholder "+1 (555) 000-0000")
Active/Inactive badge per option.

#### Passkeys (`SettingsSecurityPasskeys.tsx`)
Short explainer: "Passkeys let you sign in with your device instead of a password."
Empty state with a "Add Passkey" button (disabled).

#### Active Sessions (`SettingsSecuritySessions.tsx`)
Mock list of 2 sessions:
1. Chrome · macOS · Manila, PH · Active now → "This device"
2. Safari · iPhone · Manila, PH · 2 hours ago → "Revoke" button (disabled)

#### Trusted Devices (`SettingsSecurityTrustedDevices.tsx`)
Empty state: "No trusted devices yet. When you verify a device, it appears here."

#### Login Activity (`SettingsSecurityLoginActivity.tsx`)
Mock log of 5 rows (timestamp, device, location, status):
- Success rows: green checkmark
- Failed row (1 of 5): red X with "Failed attempt"
Columns: Date/Time | Device | Location | Status

#### Backup Codes (`SettingsSecurityBackupCodes.tsx`)
Grid of 10 codes, all masked with `•••••••••`.
"Reveal Codes" button toggles visibility.
"Download Codes" and "Regenerate" buttons (disabled).
Warning: "Each code can only be used once."

#### Account Recovery (`SettingsSecurityAccountRecovery.tsx`)
Two rows:
- Recovery Email: "j***@gmail.com" — "Update" button (disabled)
- Recovery Phone: "Not set" — "Add" button (disabled)
Note: "Used to verify your identity if you lose access to your account."

---

## 3. Trade Card Padding Fix

**Files:** `TradeForm.tsx`, `TradingPanel.tsx`

| Location | Current | Updated |
|---|---|---|
| TradeForm header (`border-b` div) | `px-3 py-2` | `px-4 py-3` |
| TradeForm inner content wrapper | `p-3` | `p-4` |
| TradingPanel open orders section | `p-3` | `p-4` |

No other changes to TradeForm layout or spacing.

---

## Routing

New routes in `App.tsx`:
```
/forgot-password
/settings/security
/settings/security/change-password
/settings/security/2fa
/settings/security/passkeys
/settings/security/sessions
/settings/security/trusted-devices
/settings/security/login-activity
/settings/security/backup-codes
/settings/security/account-recovery
```

---

## File Checklist

New files:
- `src/pages/ForgotPassword.tsx`
- `src/pages/settings/SettingsSecurity.tsx`
- `src/pages/settings/SettingsSecurityChangePassword.tsx`
- `src/pages/settings/SettingsSecurity2FA.tsx`
- `src/pages/settings/SettingsSecurityPasskeys.tsx`
- `src/pages/settings/SettingsSecuritySessions.tsx`
- `src/pages/settings/SettingsSecurityTrustedDevices.tsx`
- `src/pages/settings/SettingsSecurityLoginActivity.tsx`
- `src/pages/settings/SettingsSecurityBackupCodes.tsx`
- `src/pages/settings/SettingsSecurityAccountRecovery.tsx`

Modified files:
- `src/components/auth/AuthForm.tsx` — forgot password link + remember me
- `src/pages/settings/Settings.tsx` — add Security section
- `src/components/trading/TradeForm.tsx` — padding fix
- `src/components/trading/TradingPanel.tsx` — padding fix
- `src/App.tsx` — new routes

---

## WCAG Notes
- All new form fields have associated `<label>` elements
- Masked backup codes use `aria-label="Hidden backup code"` on each masked span; Reveal button has `aria-expanded`
- Session list rows use `<ul>/<li>` semantics
- Login activity table uses `<table>` with `<th scope="col">`
- New pages all use `<main>` via the existing layout shell
