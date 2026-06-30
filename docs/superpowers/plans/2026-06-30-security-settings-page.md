# Security Settings & Sign-in Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Forgot Password + Remember Me to sign-in, build a full Security Settings section with 8 sub-pages (all display-only), and fix inconsistent trade card padding.

**Architecture:** All new pages are pure display components following the existing `SettingsBackHeader` + `SettingsRow` / `SettingsToggle` pattern. No backend wiring — toggles use local `useState`, sub-page forms are disabled. Routes are added to `App.tsx` without `AuthGuard` so security features are browsable while logged out.

**Tech Stack:** React 18, TypeScript, React Router v6, Tailwind CSS, Lucide React icons, Vite + Vitest.

## Global Constraints

- Follow existing `SettingsRow` / `SettingsToggle` / `SettingsBackHeader` component API exactly — no new shared components
- All interactive elements must have 44×44 px minimum touch target (already enforced by existing components)
- No `AuthGuard` on new security routes — accessible while logged out
- All form fields in sub-pages are `disabled` — display only
- Padding tokens: `p-4` for trade form (not `p-3`, not `p-5`)
- Imports use path aliases consistent with the codebase (relative paths, e.g. `../../components/settings/SettingsBackHeader`)
- Lucide icons: import individually from `lucide-react`
- Every new page: `export function PageName()` (named export, no default)

---

## Task 1: Fix Trade Card Padding

**Files:**
- Modify: `src/components/trading/TradeForm.tsx:133–139`
- Modify: `src/components/trading/TradingPanel.tsx:44`

**Interfaces:**
- Consumes: nothing new
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Update TradeForm header padding**

In `src/components/trading/TradeForm.tsx`, find the header div at line 133–134:
```tsx
// Before
<div className="border-b border-line px-3 py-2">

// After
<div className="border-b border-line px-4 py-3">
```

- [ ] **Step 2: Update TradeForm inner content padding**

In `src/components/trading/TradeForm.tsx`, find the content wrapper at line 139:
```tsx
// Before
<div className="flex-1 space-y-3 overflow-y-auto p-3">

// After
<div className="flex-1 space-y-3 overflow-y-auto p-4">
```

- [ ] **Step 3: Update TradingPanel open orders padding**

In `src/components/trading/TradingPanel.tsx`, find the open orders section at line 44:
```tsx
// Before
<div className="border-t border-line p-3">

// After
<div className="border-t border-line p-4">
```

- [ ] **Step 4: Verify build passes**

```bash
cd /Users/jonathanbautista/Documents/Work/AI/meridian && npm run build 2>&1 | tail -10
```
Expected: build exits 0 with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/trading/TradeForm.tsx src/components/trading/TradingPanel.tsx
git commit -m "fix: increase trade card padding from p-3 to p-4 for visual consistency"
```

---

## Task 2: Sign-in Form — Forgot Password + Remember Me

**Files:**
- Modify: `src/components/auth/AuthForm.tsx`
- Create: `src/pages/ForgotPassword.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: `/forgot-password` route consumed by Task 3's `App.tsx` update

- [ ] **Step 1: Add Forgot Password link and Remember Me to AuthForm**

Replace the password `<div>` block in `src/components/auth/AuthForm.tsx` (lines 81–95) with:

```tsx
<div>
  <div className="mb-1 flex items-center justify-between">
    <label htmlFor="password" className="text-sm font-medium">
      Password
    </label>
    {isLogin && (
      <Link
        to="/forgot-password"
        className="text-xs text-brand hover:underline"
        tabIndex={0}
      >
        Forgot password?
      </Link>
    )}
  </div>
  <input
    id="password"
    type="password"
    autoComplete={isLogin ? "current-password" : "new-password"}
    required
    minLength={6}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="w-full rounded-lg border border-line bg-base px-3 py-2.5 outline-none focus:border-brand"
  />
</div>

{isLogin && (
  <label className="flex cursor-pointer items-center gap-2 select-none">
    <input
      type="checkbox"
      className="accent-brand h-4 w-4 rounded"
    />
    <span className="text-sm text-ink-muted">Remember me</span>
  </label>
)}
```

The Remember Me label goes between the password field and the error/notice messages. Insert it after the closing `</div>` of the password block and before the `{error && ...}` block.

- [ ] **Step 2: Create ForgotPassword page**

Create `src/pages/ForgotPassword.tsx`:

```tsx
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center">
      <div className="mb-6 flex items-center justify-center gap-2">
        <TrendingUp className="h-7 w-7 text-brand" aria-hidden="true" />
        <span className="text-2xl font-extrabold tracking-tight">Meridian</span>
      </div>

      <div className="card p-5">
        <h1 className="mb-1 text-xl font-bold">Reset your password</h1>
        <p className="mb-5 text-sm text-ink-muted">
          Enter your email and we'll send a reset link if an account exists.
        </p>

        {sent ? (
          <div role="status" className="space-y-4">
            <p className="rounded-lg bg-up/10 px-4 py-3 text-sm text-up">
              If an account exists for <strong>{email}</strong>, you'll receive
              a reset link shortly.
            </p>
            <Link
              to="/login"
              className="block text-center text-sm font-medium text-brand hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="reset-email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-line bg-base px-3 py-2.5 outline-none focus:border-brand"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-hover"
            >
              Send reset link
            </button>
            <p className="text-center text-sm text-ink-muted">
              <Link to="/login" className="font-medium text-brand hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add /forgot-password route to App.tsx**

In `src/App.tsx`, add the import at the top with the other page imports:
```tsx
import { ForgotPassword } from "./pages/ForgotPassword";
```

Then add the route before `<Route path="/login"`:
```tsx
<Route path="/forgot-password" element={<ForgotPassword />} />
```

- [ ] **Step 4: Verify build passes**

```bash
cd /Users/jonathanbautista/Documents/Work/AI/meridian && npm run build 2>&1 | tail -10
```
Expected: exits 0 with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/AuthForm.tsx src/pages/ForgotPassword.tsx src/App.tsx
git commit -m "feat: add forgot password link, remember me checkbox, and forgot-password page"
```

---

## Task 3: Security Hub Page + Settings Integration

**Files:**
- Create: `src/pages/settings/SettingsSecurity.tsx`
- Modify: `src/pages/settings/Settings.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `SettingsRow`, `SettingsToggle`, `SettingsBackHeader` (existing components)
- Produces: `/settings/security` route consumed by all sub-page tasks

- [ ] **Step 1: Create SettingsSecurity.tsx hub page**

Create `src/pages/settings/SettingsSecurity.tsx`:

```tsx
import { useState } from 'react';
import {
  KeyRound, Fingerprint, Key, Monitor, ShieldCheck,
  Activity, Timer, LifeBuoy, Mail, ScrollText,
} from 'lucide-react';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { SettingsToggle } from '../../components/settings/SettingsToggle';

export function SettingsSecurity() {
  const [biometric, setBiometric] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Security" />

      {/* Authentication */}
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Authentication
      </p>
      <div className="card divide-y divide-line mb-6">
        <SettingsRow
          icon={KeyRound}
          label="Change Password"
          to="/settings/security/change-password"
        />
        <SettingsRow
          icon={ShieldCheck}
          label="Two-Factor Authentication"
          value="Off"
          to="/settings/security/2fa"
        />
        <SettingsToggle
          label="Biometric Login"
          description="Use Face ID or fingerprint to sign in"
          checked={biometric}
          onChange={setBiometric}
        />
        <SettingsRow
          icon={Key}
          label="Passkeys"
          value="None added"
          to="/settings/security/passkeys"
        />
      </div>

      {/* Sessions & Devices */}
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Sessions & Devices
      </p>
      <div className="card divide-y divide-line mb-6">
        <SettingsRow
          icon={Monitor}
          label="Active Sessions"
          value="1 device"
          to="/settings/security/sessions"
        />
        <SettingsRow
          icon={ShieldCheck}
          label="Trusted Devices"
          value="0 trusted"
          to="/settings/security/trusted-devices"
        />
      </div>

      {/* Monitoring */}
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Monitoring
      </p>
      <div className="card divide-y divide-line mb-6">
        <SettingsRow
          icon={Activity}
          label="Login Activity"
          to="/settings/security/login-activity"
        />
        <SettingsToggle
          label="Security Alerts"
          description="Email me on new sign-in from an unrecognized device"
          checked={securityAlerts}
          onChange={setSecurityAlerts}
        />
        <SettingsRow
          icon={Timer}
          label="Auto-lock After Inactivity"
          value="15 min"
        />
      </div>

      {/* Recovery */}
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Recovery
      </p>
      <div className="card divide-y divide-line mb-6">
        <SettingsRow
          icon={Key}
          label="Backup Codes"
          value="10 remaining"
          to="/settings/security/backup-codes"
        />
        <SettingsRow
          icon={Mail}
          label="Recovery Email"
          value="j***@gmail.com"
        />
        <SettingsRow
          icon={LifeBuoy}
          label="Account Recovery"
          to="/settings/security/account-recovery"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add Security section to Settings hub**

In `src/pages/settings/Settings.tsx`, add `Shield` to the existing lucide import line:
```tsx
import {
  Bell, DollarSign, Globe, Info, FileText, Lock,
  Shield, UserPen, LogOut, LogIn,
} from 'lucide-react';
```
(`Shield` is already imported — verify it's there, if not add it.)

Add the security section JSX. In both the logged-out and logged-in return blocks, insert the security section immediately after the Account section and before `{preferencesSection}`. Create a `securitySection` constant near the other section constants:

```tsx
const securitySection = (
  <>
    <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
      Security
    </p>
    <div className="card divide-y divide-line mb-6">
      <SettingsRow icon={Shield} label="Security" to="/settings/security" />
    </div>
  </>
);
```

Then add `{securitySection}` in both the logged-out JSX (after the account sign-in prompt card) and the logged-in JSX (after the account profile card + edit row), both before `{preferencesSection}`.

- [ ] **Step 3: Register all security routes in App.tsx**

Add import at the top of `src/App.tsx` (after existing settings imports):
```tsx
import { SettingsSecurity } from "./pages/settings/SettingsSecurity";
import { SettingsSecurityChangePassword } from "./pages/settings/SettingsSecurityChangePassword";
import { SettingsSecurity2FA } from "./pages/settings/SettingsSecurity2FA";
import { SettingsSecurityPasskeys } from "./pages/settings/SettingsSecurityPasskeys";
import { SettingsSecuritySessions } from "./pages/settings/SettingsSecuritySessions";
import { SettingsSecurityTrustedDevices } from "./pages/settings/SettingsSecurityTrustedDevices";
import { SettingsSecurityLoginActivity } from "./pages/settings/SettingsSecurityLoginActivity";
import { SettingsSecurityBackupCodes } from "./pages/settings/SettingsSecurityBackupCodes";
import { SettingsSecurityAccountRecovery } from "./pages/settings/SettingsSecurityAccountRecovery";
```

Add routes before `<Route path="/login"`:
```tsx
<Route path="/settings/security" element={<SettingsSecurity />} />
<Route path="/settings/security/change-password" element={<SettingsSecurityChangePassword />} />
<Route path="/settings/security/2fa" element={<SettingsSecurity2FA />} />
<Route path="/settings/security/passkeys" element={<SettingsSecurityPasskeys />} />
<Route path="/settings/security/sessions" element={<SettingsSecuritySessions />} />
<Route path="/settings/security/trusted-devices" element={<SettingsSecurityTrustedDevices />} />
<Route path="/settings/security/login-activity" element={<SettingsSecurityLoginActivity />} />
<Route path="/settings/security/backup-codes" element={<SettingsSecurityBackupCodes />} />
<Route path="/settings/security/account-recovery" element={<SettingsSecurityAccountRecovery />} />
```

Note: App.tsx imports these before the sub-page files exist. The build will fail until Task 4–6 create those files. That's expected — commit App.tsx changes as part of Task 6 (last task) instead of this task. For now, create only `SettingsSecurity.tsx` and update `Settings.tsx`, deferring the App.tsx route additions to Task 6.

- [ ] **Step 4: Verify build passes (without sub-page routes yet)**

```bash
cd /Users/jonathanbautista/Documents/Work/AI/meridian && npm run build 2>&1 | tail -10
```
Expected: exits 0. (App.tsx not yet modified in this task.)

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/SettingsSecurity.tsx src/pages/settings/Settings.tsx
git commit -m "feat: add Security hub page and Security section to Settings"
```

---

## Task 4: Authentication Sub-Pages

**Files:**
- Create: `src/pages/settings/SettingsSecurityChangePassword.tsx`
- Create: `src/pages/settings/SettingsSecurity2FA.tsx`
- Create: `src/pages/settings/SettingsSecurityPasskeys.tsx`

**Interfaces:**
- Consumes: `SettingsBackHeader` (existing)
- Produces: three pages consumed by App.tsx routes in Task 6

- [ ] **Step 1: Create ChangePassword page**

Create `src/pages/settings/SettingsSecurityChangePassword.tsx`:

```tsx
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

export function SettingsSecurityChangePassword() {
  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Change Password" />
      <div className="card p-5 mb-3">
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="current-password" className="mb-1 block text-sm font-medium">
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              disabled
              placeholder="••••••••"
              className="w-full rounded-lg border border-line bg-base px-3 py-2.5 text-ink-muted outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              disabled
              placeholder="••••••••"
              className="w-full rounded-lg border border-line bg-base px-3 py-2.5 text-ink-muted outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              disabled
              placeholder="••••••••"
              className="w-full rounded-lg border border-line bg-base px-3 py-2.5 text-ink-muted outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled
            className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white opacity-50 cursor-not-allowed"
          >
            Update Password
          </button>
        </form>
      </div>
      <p className="px-1 text-xs text-ink-muted">
        For your security, you'll be signed out of all other devices after changing your password.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create 2FA page**

Create `src/pages/settings/SettingsSecurity2FA.tsx`:

```tsx
import { useState } from 'react';
import { Smartphone, MessageSquare } from 'lucide-react';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

export function SettingsSecurity2FA() {
  const [codesRevealed, setCodesRevealed] = useState(false);

  const backupCodes = [
    'A1B2-C3D4', 'E5F6-G7H8', 'I9J0-K1L2', 'M3N4-O5P6', 'Q7R8-S9T0',
    'U1V2-W3X4', 'Y5Z6-A7B8', 'C9D0-E1F2', 'G3H4-I5J6', 'K7L8-M9N0',
  ];

  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Two-Factor Authentication" />

      <p className="mb-4 px-1 text-sm text-ink-muted">
        Add a second layer of security to your account. You'll be asked for a
        verification code each time you sign in.
      </p>

      {/* Authenticator App */}
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Authenticator App
      </p>
      <div className="card p-5 mb-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-ink-muted" aria-hidden="true" />
            <span className="text-sm font-semibold">TOTP Authenticator</span>
          </div>
          <span className="rounded-full bg-up/15 px-2 py-0.5 text-xs font-semibold text-up">
            Recommended
          </span>
        </div>

        {/* QR Code placeholder */}
        <div
          className="mb-4 flex h-36 w-36 items-center justify-center rounded-lg border-2 border-dashed border-line bg-elevated text-xs text-ink-muted"
          aria-label="QR code placeholder"
        >
          QR code
        </div>

        <p className="mb-3 text-xs text-ink-muted">
          Scan this QR code with your authenticator app (Google Authenticator,
          Authy, etc.), then enter the 6-digit code to verify.
        </p>

        <div>
          <label htmlFor="totp-code" className="mb-1 block text-sm font-medium">
            Verification Code
          </label>
          <div className="flex gap-2">
            <input
              id="totp-code"
              type="text"
              disabled
              placeholder="000 000"
              className="w-full rounded-lg border border-line bg-base px-3 py-2.5 text-center font-mono text-ink-muted outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="button"
              disabled
              className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white opacity-50 cursor-not-allowed whitespace-nowrap"
            >
              Verify
            </button>
          </div>
        </div>

        {/* Backup codes */}
        <div className="mt-4 border-t border-line pt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
              Backup Codes
            </p>
            <button
              type="button"
              onClick={() => setCodesRevealed((v) => !v)}
              aria-expanded={codesRevealed}
              className="text-xs font-medium text-brand hover:underline"
            >
              {codesRevealed ? 'Hide' : 'Reveal'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {backupCodes.map((code, i) => (
              <span
                key={i}
                aria-label={codesRevealed ? code : 'Hidden backup code'}
                className="rounded bg-elevated px-2 py-1 font-mono text-xs tabular-nums text-ink"
              >
                {codesRevealed ? code : '•••••••••'}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-ink-muted">
            Each code can only be used once. Store them somewhere safe.
          </p>
        </div>
      </div>

      {/* SMS option */}
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        SMS
      </p>
      <div className="card p-5 mb-3">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-ink-muted" aria-hidden="true" />
          <span className="text-sm font-semibold">Text Message</span>
        </div>
        <div>
          <label htmlFor="sms-number" className="mb-1 block text-sm font-medium">
            Phone Number
          </label>
          <input
            id="sms-number"
            type="tel"
            disabled
            placeholder="+1 (555) 000-0000"
            className="w-full rounded-lg border border-line bg-base px-3 py-2.5 text-ink-muted outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </div>
      <p className="px-1 text-xs text-ink-muted">
        SMS codes are less secure than an authenticator app. Use an authenticator
        app when possible.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create Passkeys page**

Create `src/pages/settings/SettingsSecurityPasskeys.tsx`:

```tsx
import { Key } from 'lucide-react';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

export function SettingsSecurityPasskeys() {
  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Passkeys" />
      <p className="mb-4 px-1 text-sm text-ink-muted">
        Passkeys let you sign in with your device's biometrics or PIN instead of
        a password — faster, phishing-resistant, and more secure.
      </p>
      <div className="card p-5 mb-3">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-elevated">
            <Key className="h-7 w-7 text-ink-muted" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold">No passkeys yet</p>
            <p className="mt-1 text-sm text-ink-muted">
              Add a passkey to sign in without a password.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white opacity-50 cursor-not-allowed"
          >
            Add Passkey
          </button>
        </div>
      </div>
      <p className="px-1 text-xs text-ink-muted">
        Passkeys are stored on your device and never shared with Meridian servers.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript (no App.tsx wiring yet)**

```bash
cd /Users/jonathanbautista/Documents/Work/AI/meridian && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors for the three new files (other errors from missing sub-page imports in App.tsx are expected if you ran the App.tsx import additions already — but App.tsx hasn't been modified yet so this should be clean).

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/SettingsSecurityChangePassword.tsx src/pages/settings/SettingsSecurity2FA.tsx src/pages/settings/SettingsSecurityPasskeys.tsx
git commit -m "feat: add Change Password, 2FA, and Passkeys security sub-pages"
```

---

## Task 5: Sessions, Devices & Monitoring Sub-Pages

**Files:**
- Create: `src/pages/settings/SettingsSecuritySessions.tsx`
- Create: `src/pages/settings/SettingsSecurityTrustedDevices.tsx`
- Create: `src/pages/settings/SettingsSecurityLoginActivity.tsx`

**Interfaces:**
- Consumes: `SettingsBackHeader` (existing)
- Produces: three pages consumed by App.tsx routes in Task 6

- [ ] **Step 1: Create Active Sessions page**

Create `src/pages/settings/SettingsSecuritySessions.tsx`:

```tsx
import { Monitor, Smartphone } from 'lucide-react';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

const SESSIONS = [
  {
    id: 1,
    device: 'Chrome · macOS',
    location: 'Manila, PH',
    lastSeen: 'Active now',
    isCurrent: true,
    Icon: Monitor,
  },
  {
    id: 2,
    device: 'Safari · iPhone',
    location: 'Manila, PH',
    lastSeen: '2 hours ago',
    isCurrent: false,
    Icon: Smartphone,
  },
] as const;

export function SettingsSecuritySessions() {
  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Active Sessions" />
      <div className="card divide-y divide-line mb-3">
        {SESSIONS.map(({ id, device, location, lastSeen, isCurrent, Icon }) => (
          <div key={id} className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <Icon className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{device}</p>
                <p className="text-xs text-ink-muted">
                  {location} · {lastSeen}
                </p>
              </div>
            </div>
            {isCurrent ? (
              <span className="shrink-0 rounded-full bg-up/15 px-2 py-0.5 text-xs font-semibold text-up">
                This device
              </span>
            ) : (
              <button
                type="button"
                disabled
                className="shrink-0 rounded-lg border border-down px-3 py-1.5 text-xs font-semibold text-down opacity-50 cursor-not-allowed"
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="px-1 text-xs text-ink-muted">
        Revoking a session signs that device out immediately.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create Trusted Devices page**

Create `src/pages/settings/SettingsSecurityTrustedDevices.tsx`:

```tsx
import { ShieldCheck } from 'lucide-react';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

export function SettingsSecurityTrustedDevices() {
  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Trusted Devices" />
      <div className="card p-5 mb-3">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-elevated">
            <ShieldCheck className="h-7 w-7 text-ink-muted" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold">No trusted devices yet</p>
            <p className="mt-1 text-sm text-ink-muted">
              When you verify a new device, it appears here.
            </p>
          </div>
        </div>
      </div>
      <p className="px-1 text-xs text-ink-muted">
        Trusted devices skip 2FA verification for 30 days.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create Login Activity page**

Create `src/pages/settings/SettingsSecurityLoginActivity.tsx`:

```tsx
import { CheckCircle, XCircle } from 'lucide-react';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

type ActivityStatus = 'success' | 'failed';

interface ActivityEntry {
  id: number;
  datetime: string;
  device: string;
  location: string;
  status: ActivityStatus;
}

const ACTIVITY: ActivityEntry[] = [
  { id: 1, datetime: 'Today, 9:14 AM', device: 'Chrome · macOS', location: 'Manila, PH', status: 'success' },
  { id: 2, datetime: 'Yesterday, 11:02 PM', device: 'Safari · iPhone', location: 'Manila, PH', status: 'success' },
  { id: 3, datetime: 'Jun 28, 3:45 PM', device: 'Firefox · Windows', location: 'Unknown', status: 'failed' },
  { id: 4, datetime: 'Jun 27, 8:21 AM', device: 'Chrome · macOS', location: 'Manila, PH', status: 'success' },
  { id: 5, datetime: 'Jun 26, 6:00 PM', device: 'Chrome · macOS', location: 'Manila, PH', status: 'success' },
];

export function SettingsSecurityLoginActivity() {
  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Login Activity" />
      <div className="card overflow-hidden mb-3">
        <table className="w-full text-sm" aria-label="Login activity log">
          <thead>
            <tr className="border-b border-line bg-elevated">
              <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Date / Device
              </th>
              <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ACTIVITY.map(({ id, datetime, device, location, status }) => (
              <tr key={id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{datetime}</p>
                  <p className="text-xs text-ink-muted">
                    {device} · {location}
                  </p>
                </td>
                <td className="px-4 py-3 text-right">
                  {status === 'success' ? (
                    <span className="inline-flex items-center gap-1 text-up">
                      <CheckCircle className="h-4 w-4" aria-hidden="true" />
                      <span className="text-xs font-semibold">Success</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-down">
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      <span className="text-xs font-semibold">Failed</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-1 text-xs text-ink-muted">
        Showing the last 5 sign-in attempts. If you see unrecognized activity,
        change your password immediately.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/jonathanbautista/Documents/Work/AI/meridian && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/SettingsSecuritySessions.tsx src/pages/settings/SettingsSecurityTrustedDevices.tsx src/pages/settings/SettingsSecurityLoginActivity.tsx
git commit -m "feat: add Active Sessions, Trusted Devices, and Login Activity security sub-pages"
```

---

## Task 6: Recovery Sub-Pages + Wire All Routes

**Files:**
- Create: `src/pages/settings/SettingsSecurityBackupCodes.tsx`
- Create: `src/pages/settings/SettingsSecurityAccountRecovery.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: all sub-pages from Tasks 4–5 (imports only)
- Produces: final working feature

- [ ] **Step 1: Create Backup Codes page**

Create `src/pages/settings/SettingsSecurityBackupCodes.tsx`:

```tsx
import { useState } from 'react';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

const BACKUP_CODES = [
  'A1B2-C3D4', 'E5F6-G7H8', 'I9J0-K1L2', 'M3N4-O5P6', 'Q7R8-S9T0',
  'U1V2-W3X4', 'Y5Z6-A7B8', 'C9D0-E1F2', 'G3H4-I5J6', 'K7L8-M9N0',
];

export function SettingsSecurityBackupCodes() {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Backup Codes" />
      <div className="card p-5 mb-3">
        <p className="mb-4 text-sm text-ink-muted">
          Use these codes to access your account if you lose your 2FA device.
          Each code can only be used once.
        </p>

        <div className="mb-4 rounded-lg border border-line bg-elevated p-4">
          <div className="grid grid-cols-2 gap-2">
            {BACKUP_CODES.map((code, i) => (
              <span
                key={i}
                aria-label={revealed ? code : 'Hidden backup code'}
                className="rounded bg-base px-2 py-1.5 text-center font-mono text-sm tabular-nums"
              >
                {revealed ? code : '•••••••••'}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-expanded={revealed}
            className="w-full rounded-lg border border-line py-2.5 text-sm font-semibold transition-colors hover:border-brand hover:text-brand"
          >
            {revealed ? 'Hide Codes' : 'Reveal Codes'}
          </button>
          <button
            type="button"
            disabled
            className="w-full rounded-lg border border-line py-2.5 text-sm font-semibold text-ink-muted opacity-50 cursor-not-allowed"
          >
            Download Codes
          </button>
          <button
            type="button"
            disabled
            className="w-full rounded-lg border border-down py-2.5 text-sm font-semibold text-down opacity-50 cursor-not-allowed"
          >
            Regenerate Codes
          </button>
        </div>
      </div>
      <p className="px-1 text-xs text-ink-muted">
        10 codes remaining. Store these somewhere safe — Meridian cannot recover
        them for you.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create Account Recovery page**

Create `src/pages/settings/SettingsSecurityAccountRecovery.tsx`:

```tsx
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

export function SettingsSecurityAccountRecovery() {
  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="Account Recovery" />
      <p className="mb-4 px-1 text-sm text-ink-muted">
        These options are used to verify your identity if you lose access to
        your account.
      </p>

      <div className="card divide-y divide-line mb-3">
        {/* Recovery Email */}
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-sm font-medium">Recovery Email</p>
            <p className="mt-0.5 text-xs text-ink-muted">j***@gmail.com</p>
          </div>
          <button
            type="button"
            disabled
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted opacity-50 cursor-not-allowed"
          >
            Update
          </button>
        </div>

        {/* Recovery Phone */}
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-sm font-medium">Recovery Phone</p>
            <p className="mt-0.5 text-xs text-ink-muted">Not set</p>
          </div>
          <button
            type="button"
            disabled
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted opacity-50 cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </div>

      <p className="px-1 text-xs text-ink-muted">
        A recovery email or phone lets Meridian verify your identity and
        restore account access if you're locked out.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Wire all security routes in App.tsx**

Add these imports after the existing settings page imports in `src/App.tsx` (the `ForgotPassword` import was already added in Task 2 — skip it here):

```tsx
import { SettingsSecurity } from "./pages/settings/SettingsSecurity";
import { SettingsSecurityChangePassword } from "./pages/settings/SettingsSecurityChangePassword";
import { SettingsSecurity2FA } from "./pages/settings/SettingsSecurity2FA";
import { SettingsSecurityPasskeys } from "./pages/settings/SettingsSecurityPasskeys";
import { SettingsSecuritySessions } from "./pages/settings/SettingsSecuritySessions";
import { SettingsSecurityTrustedDevices } from "./pages/settings/SettingsSecurityTrustedDevices";
import { SettingsSecurityLoginActivity } from "./pages/settings/SettingsSecurityLoginActivity";
import { SettingsSecurityBackupCodes } from "./pages/settings/SettingsSecurityBackupCodes";
import { SettingsSecurityAccountRecovery } from "./pages/settings/SettingsSecurityAccountRecovery";
```

Add these routes before `<Route path="/login"` (the `/forgot-password` route was already added in Task 2 — skip it here):

```tsx
<Route path="/settings/security" element={<SettingsSecurity />} />
<Route path="/settings/security/change-password" element={<SettingsSecurityChangePassword />} />
<Route path="/settings/security/2fa" element={<SettingsSecurity2FA />} />
<Route path="/settings/security/passkeys" element={<SettingsSecurityPasskeys />} />
<Route path="/settings/security/sessions" element={<SettingsSecuritySessions />} />
<Route path="/settings/security/trusted-devices" element={<SettingsSecurityTrustedDevices />} />
<Route path="/settings/security/login-activity" element={<SettingsSecurityLoginActivity />} />
<Route path="/settings/security/backup-codes" element={<SettingsSecurityBackupCodes />} />
<Route path="/settings/security/account-recovery" element={<SettingsSecurityAccountRecovery />} />
```

- [ ] **Step 4: Verify full build passes**

```bash
cd /Users/jonathanbautista/Documents/Work/AI/meridian && npm run build 2>&1 | tail -15
```
Expected: exits 0, no TypeScript errors, no missing module errors.

- [ ] **Step 5: Run existing tests to confirm no regressions**

```bash
cd /Users/jonathanbautista/Documents/Work/AI/meridian && npm test 2>&1 | tail -20
```
Expected: all existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/settings/SettingsSecurityBackupCodes.tsx src/pages/settings/SettingsSecurityAccountRecovery.tsx src/App.tsx
git commit -m "feat: add Backup Codes and Account Recovery pages, wire all security routes"
```
