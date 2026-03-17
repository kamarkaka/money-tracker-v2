# Internationalization (i18n) — Implementation Plan

## Goal

Allow users to dynamically switch the display language at any time. Persist the preference in the database so it's remembered across sessions and devices.

---

## 1. Library Choice: `next-intl`

Use [`next-intl`](https://next-intl.dev/) — the most popular i18n library for Next.js App Router. It supports:
- Client and server components
- Dynamic language switching without page reload
- Nested translation keys
- Interpolation and pluralization
- No URL path changes needed (no `/en/`, `/fr/` prefixes)

```bash
npm install next-intl
```

### Why not `i18next` / `react-i18next`?
`next-intl` is purpose-built for Next.js App Router and has first-class support for both server and client components. `i18next` requires extra wrappers for App Router compatibility.

---

## 2. Translation File Structure

```
app/
  messages/
    en.json        # English (default)
    zh.json        # Chinese (Simplified)
    es.json        # Spanish
    fr.json        # French
    ...
```

### Translation key schema

Organize by feature area, not by page. This prevents duplication and makes shared strings easy to manage.

```json
// en.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "back": "Back",
    "next": "Next",
    "skip": "Skip",
    "loading": "Loading...",
    "error": "An error occurred",
    "required": "Required",
    "email": "Email",
    "password": "Password",
    "name": "Name"
  },
  "auth": {
    "login": "Log in",
    "register": "Register",
    "logout": "Log out",
    "forgotPassword": "Forgot Password?",
    "resetPassword": "Reset Password",
    "signInWithGoogle": "Sign in with Google",
    "invalidCredentials": "Invalid email or password",
    "noAccount": "Don't have an account?",
    "hasAccount": "Already have an account?"
  },
  "nav": {
    "overview": "Overview",
    "category": "Category",
    "budget": "Budget",
    "account": "Account",
    "transaction": "Transaction",
    "profile": "Profile",
    "setting": "Setting",
    "welcome": "Welcome, {name}"
  },
  "overview": {
    "title": "Overview",
    "income": "Income",
    "expenses": "Expenses",
    "noTransactions": "No transactions this month"
  },
  "category": {
    "title": "Categories",
    "addCategory": "Add Category",
    "editCategory": "Edit Category",
    "parentOptional": "Parent (optional)",
    "noneTopLevel": "None (top level)",
    "deleteWarning": "Deleting this category will leave its transactions uncategorized."
  },
  "budget": {
    "title": "Budgets",
    "createBudget": "Create Budget",
    "monthlyAmount": "Monthly Amount",
    "noCategoriesAssigned": "No categories assigned",
    "perMonth": "{amount}/mo"
  },
  "account": {
    "title": "Accounts",
    "netWorth": "Net Worth",
    "linkBank": "Link Bank Account",
    "addManual": "Add Manual Account",
    "backfill": "Backfill from Sophtron",
    "removeInstitution": "Remove Institution",
    "removeWarning": "Are you sure? All associated accounts and transactions will be deleted.",
    "manual": "Manual",
    "institutionName": "Institution Name",
    "accountName": "Account Name",
    "accountType": "Account Type",
    "currentBalance": "Current Balance"
  },
  "transaction": {
    "title": "Transactions",
    "addTransaction": "Add Transaction",
    "importCsv": "Import CSV",
    "deleteTransaction": "Delete Transaction",
    "deleteWarning": "Are you sure? This cannot be undone.",
    "description": "Description",
    "amount": "Amount",
    "date": "Date",
    "expense": "Expense",
    "income": "Income",
    "hide": "Hide",
    "unhide": "Unhide"
  },
  "profile": {
    "title": "Profile",
    "userInfo": "User Information",
    "userId": "User ID",
    "changePassword": "Change Password",
    "currentPassword": "Current Password",
    "newPassword": "New Password",
    "confirmPassword": "Confirm New Password",
    "profileUpdated": "Profile updated successfully.",
    "passwordChanged": "Password changed successfully."
  },
  "setting": {
    "title": "Setting",
    "appearance": "Appearance",
    "appearanceDesc": "Choose how Money Tracker looks to you.",
    "light": "Light",
    "dark": "Dark",
    "system": "System",
    "lightDesc": "Always use light mode",
    "darkDesc": "Always use dark mode",
    "systemDesc": "Follow your browser setting",
    "language": "Language",
    "languageDesc": "Choose your preferred display language."
  },
  "tutorial": {
    "welcome": "Welcome to Money Tracker 2!",
    "welcomeDesc": "Let's get you set up in a few quick steps. You can skip any step or quit at any time.",
    "letsGo": "Let's Go",
    "skipTutorial": "Skip Tutorial",
    "quickTour": "A Quick Tour",
    "setupCategories": "Set Up Categories",
    "setupBudgets": "Set Up Budgets",
    "linkAccounts": "Add Bank Accounts",
    "allSet": "You're All Set!",
    "goToOverview": "Go to Overview"
  }
}
```

### Translation workflow
- Start with English (`en.json`) as the source of truth
- Translate to other languages manually or with AI assistance
- Each language file has the exact same key structure

---

## 3. Database Change

Add `language` to the existing `user_setting` table:

```diff
 model UserSetting {
   id        String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
   userId    String @unique @map("user_id") @db.Uuid
   theme     String @default("system") @db.VarChar(20)
+  language  String @default("en") @map("language") @db.VarChar(10)

   user User @relation(fields: [userId], references: [id], onDelete: Cascade)

   @@map("user_setting")
 }
```

Migration:
```sql
ALTER TABLE "user_setting" ADD COLUMN "language" VARCHAR(10) NOT NULL DEFAULT 'en';
```

---

## 4. API Changes

### `GET /api/setting`
Already exists. Add `language` to the response:
```json
{ "theme": "dark", "language": "en" }
```

### `PUT /api/setting`
Already exists. Accept `language` in the body:
```json
{ "language": "zh" }
```
Validate against supported locales list.

---

## 5. Locale Provider Architecture

### Configuration file

```typescript
// app/i18n/config.ts
export const SUPPORTED_LOCALES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "zh", label: "Chinese (Simplified)", nativeLabel: "简体中文" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "fr", label: "French", nativeLabel: "Français" },
] as const;

export const DEFAULT_LOCALE = "en";
export type Locale = (typeof SUPPORTED_LOCALES)[number]["code"];
```

### Locale Provider

Extend the existing `ThemeProvider` pattern. Create a `LocaleProvider` that:
1. Loads the user's language preference from `/api/setting` on mount
2. Dynamically imports the matching message file (`app/messages/{locale}.json`)
3. Wraps children with `next-intl`'s `NextIntlClientProvider`
4. Exposes a `setLocale()` function for dynamic switching

```typescript
// app/components/LocaleProvider.tsx
"use client";

import { NextIntlClientProvider } from "next-intl";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState("en");
  const [messages, setMessages] = useState<Record<string, unknown> | null>(null);

  // Load from /api/setting on mount, then dynamically import messages
  useEffect(() => {
    fetch("/api/setting")
      .then(res => res.json())
      .then(async (data) => {
        const lang = data.language || "en";
        const msgs = (await import(`@/app/messages/${lang}.json`)).default;
        setLocaleState(lang);
        setMessages(msgs);
      });
  }, []);

  const setLocale = async (newLocale: string) => {
    const msgs = (await import(`@/app/messages/${newLocale}.json`)).default;
    setLocaleState(newLocale);
    setMessages(msgs);
    // Persist
    fetch("/api/setting", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: newLocale }),
    });
  };

  if (!messages) return null; // or a loading spinner

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
```

### Integration

Wrap in `AppShell` alongside `ThemeProvider`:
```tsx
<ThemeProvider>
  <LocaleProvider>
    <div>...</div>
  </LocaleProvider>
</ThemeProvider>
```

---

## 6. Refactoring Strings

### Using translations in components

```tsx
// Before
<h1>Transactions</h1>
<button>Add Transaction</button>

// After
import { useTranslations } from "next-intl";

const t = useTranslations("transaction");
<h1>{t("title")}</h1>
<button>{t("addTransaction")}</button>
```

### Interpolation

```tsx
// en.json: "welcome": "Welcome, {name}"
t("nav.welcome", { name: userName })
```

### Pluralization

```tsx
// en.json: "categoriesSelected": "{count, plural, =0 {No categories} one {1 category} other {# categories}} selected"
t("categoriesSelected", { count: selectedCount })
```

### Refactoring approach — by area

| Priority | Area | File count | Notes |
|----------|------|-----------|-------|
| 1 | Common UI components | ~10 | Buttons, modals, confirm dialogs — used everywhere |
| 2 | Navigation (Topbar) | 1 | High visibility |
| 3 | Setting page | 1 | Needed for the language picker itself |
| 4 | Auth pages | 4 | Login, register, forgot/reset password |
| 5 | Dashboard pages | 6 | Overview, account, budget, category, transaction, profile |
| 6 | Feature components | ~15 | Modals, forms, editors |
| 7 | Tutorial steps | 6 | Onboarding flow |
| 8 | API error messages | ~15 | Server-side — see note below |

### API error messages

API error messages are returned as JSON and displayed client-side. Two approaches:

**Option A (recommended)**: Return error codes from the API, translate client-side.
```typescript
// API
return NextResponse.json({ error: "ACCOUNT_NOT_FOUND" }, { status: 404 });

// Client
const t = useTranslations("errors");
setError(t(data.error)); // looks up "errors.ACCOUNT_NOT_FOUND" in messages
```

**Option B**: Keep English error messages from the API, use them as fallback. Only translate well-known error patterns client-side. Simpler but less complete.

Recommend **Option A** for user-facing errors (validation, not found) and keep technical errors in English.

---

## 7. Setting Page — Language Picker

Add a language selection section below the Appearance section:

```tsx
<div>
  <h2>Language</h2>
  <p>Choose your preferred display language.</p>
  <div className="flex gap-4">
    {SUPPORTED_LOCALES.map((loc) => (
      <button
        key={loc.code}
        onClick={() => setLocale(loc.code)}
        className={selected ? "border-zinc-900" : "border-zinc-200"}
      >
        <span>{loc.nativeLabel}</span>
        <span>{loc.label}</span>
      </button>
    ))}
  </div>
</div>
```

Also add a quick language switcher in the Topbar dropdown menu (similar to the theme toggle).

---

## 8. Auth Pages (Pre-Login)

Auth pages are outside the dashboard layout and `AppShell`, so they don't have access to `LocaleProvider`. Two approaches:

**Option A**: Use browser's `navigator.language` for auth pages. Once logged in, the user's saved preference takes over.

**Option B**: Store locale in a cookie so it persists across auth and dashboard pages. The `LocaleProvider` writes a `locale` cookie on change; auth pages read it.

Recommend **Option B** for consistency. Use a simple cookie (`locale=zh`) readable by both server and client components.

---

## 9. File Changes Summary

| Area | File | Change |
|------|------|--------|
| **New dependency** | `package.json` | Add `next-intl` |
| **Translation files** | `app/messages/en.json` | English translations (source of truth) |
| **Translation files** | `app/messages/zh.json`, `es.json`, `fr.json` | Additional languages |
| **Config** | `app/i18n/config.ts` | Supported locales, default locale |
| **Provider** | `app/components/LocaleProvider.tsx` | Context + `NextIntlClientProvider` wrapper |
| **Schema** | `prisma/schema.prisma` | Add `language` to `UserSetting` |
| **Migration** | `prisma/migrations/...` | `ALTER TABLE user_setting ADD COLUMN language` |
| **API** | `app/api/setting/route.ts` | Handle `language` field in GET/PUT |
| **Layout** | `app/components/layout/AppShell.tsx` | Wrap with `LocaleProvider` |
| **Setting page** | `app/(dashboard)/setting/page.tsx` | Language picker UI |
| **Topbar** | `app/components/layout/Topbar.tsx` | Quick language indicator/switcher |
| **All .tsx files** | ~50 files | Replace hardcoded strings with `t()` calls |

---

## 10. Recommended Implementation Order

1. **Install `next-intl`, create `en.json`** — start with English only
2. **Schema + API** — add `language` column, update setting endpoint
3. **`LocaleProvider` + `AppShell` integration** — wiring
4. **Setting page** — language picker UI
5. **Refactor common components** — buttons, modals, shared UI
6. **Refactor Topbar + auth pages** — navigation and login/register
7. **Refactor dashboard pages** — one at a time
8. **Add second language** (e.g. `zh.json`) — validate the whole flow end-to-end
9. **Add remaining languages** — translate from the validated English keys
10. **API error codes** — refactor error messages to use codes + client-side translation
