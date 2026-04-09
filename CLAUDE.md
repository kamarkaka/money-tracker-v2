# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Money Tracker 2 is a personal finance tracking app with two frontends (web + mobile) sharing code through a monorepo. The mobile app stores all data locally on-device (SQLite); the web app uses PostgreSQL via Prisma. There are no tests in this project.

## Monorepo Structure

```
apps/web/          — Next.js 16 web app (NextAuth, Prisma, PostgreSQL, Sophtron)
apps/mobile/       — Expo/React Native iOS app (local-first, SQLite, Plaid)
packages/shared/   — Types, constants, utilities shared across apps
packages/api-client/ — HTTP API client (used by web app and as interface contract for mobile)
packages/hooks/    — React hooks wrapping api-client (useTransactions, useCategories, etc.)
```

npm workspaces. Package names: `@money-tracker/web`, `@money-tracker/mobile`, `@money-tracker/shared`, `@money-tracker/api-client`, `@money-tracker/hooks`.

## Commands

```bash
# Web app
npm run dev                          # Start web dev server (Next.js)
npm run build                        # Build web app
npm run lint                         # Lint web app

# Mobile app
cd apps/mobile
npx expo start                       # Start Expo dev server
npx expo run:ios -d "DEVICE_NAME"    # Build and run on iOS simulator/device
npx tsc --noEmit                     # TypeScript check (mobile)

# EAS (mobile builds/submit)
cd apps/mobile
eas build --platform ios --profile production
eas submit --platform ios --latest

# Prisma (web database)
cd apps/web
npx prisma generate
npx prisma migrate dev
```

## Mobile App Architecture

The mobile app is **local-first** — no server authentication, no remote API calls. All data lives in SQLite on the device.

**Key pattern:** `LocalClient` (in `lib/db/local-client.ts`) extends `ApiClient` and overrides the `request()` method to route URL paths to local SQLite queries. This means all existing code that uses `createTransactionApi(client)`, `createCategoryApi(client)`, etc. works without changes — the same interface contract, different backend.

```
lib/db/database.ts    — SQLite schema, initialization, seeding (10 tables)
lib/db/local-client.ts — LocalClient: routes API paths to SQLite queries
lib/db/export.ts      — Export all tables as CSV files in a ZIP (custom ZIP impl)
lib/db/import.ts      — Import ZIP of CSV files into SQLite
lib/api.ts            — Exports LocalClient instance as `apiClient`
```

**Data flow:** Screen -> `createXxxApi(apiClient)` -> `apiClient.get("/api/xxx")` -> `LocalClient.request()` -> SQLite query -> response shaped to match API types.

**State management:** React Context only (no Redux/Zustand). Five contexts layered at root: ThemeContext, ApiClientContext, I18nContext, SubscriptionContext, ModalContext.

**Navigation:** Expo Router file-based routing. Pro users get customizable bottom tabs (1-4 from 7 available) plus a "More" menu. Casual users get only the overview tab plus "More". All sections also exist as stack `pages/` routes for access from the More menu. FAB opens TransactionModal.

**i18n:** `lib/i18n.tsx` with JSON files in `assets/i18n/{en,zh}.json`. Use `i18n("key.path")` for translations.

**Theme:** `lib/themeContext.ts` + `lib/theme.ts`. Brand color is `#10b981` (green), used for the FAB, active tabs, selected month pills.

### Subscription Model (Casual vs Pro)

Two tiers managed via `react-native-iap` (`lib/subscription.tsx`):
- **Casual (free):** Overview tab only, emoji-based category grid, limited features
- **Pro (subscription):** Customizable tabs, dropdown category picker with parent/child hierarchy, tags, budgets, rules, Plaid integration, setup checklist

### Bank Aggregation (Mobile: Plaid)

The mobile app uses **Plaid** for bank account linking. Users supply their own Plaid API credentials, stored in SecureStore (iOS Keychain).

```
lib/plaid/api.ts      — Direct Plaid REST API calls (no server proxy)
lib/plaid/storage.ts  — SecureStore for access tokens and credentials
lib/plaid/sync.ts     — Full sync with quota system (300 points/month)
```

Quota: each linked institution costs 30 pts/month, one free refresh/month, paid refreshes cost 13 pts with 24hr cooldown. Dev mode bypasses quota.

### Auto-Categorization Rules

Both web and mobile share the same rules engine: case-insensitive substring matching on transaction description, ordered by sequence number. When a user manually assigns a category, a rule is auto-created/upserted. During Plaid/Sophtron sync, rules are applied to incoming transactions.

## Web App Architecture

Next.js App Router at `apps/web/app/`. API routes at `app/api/`. Prisma schema at `apps/web/prisma/schema.prisma`. Prisma client output: `app/generated/prisma/`.

**Auth:** NextAuth v5 (beta) with JWT strategy. Google OAuth + email/password credentials. The `auth()` function in `lib/auth.ts` is dual-mode: tries NextAuth session first, then falls back to mobile JWT bearer token verification. No middleware.ts — auth is enforced at the dashboard layout level and per-API-route.

**i18n:** Uses `next-intl` with messages at `app/messages/{en,es,fr}.json`. Note: web supports en/es/fr while mobile supports en/zh.

### Bank Aggregation (Web: Sophtron)

The web app uses **Sophtron** (not Plaid) for bank account linking and transaction sync.

```
app/lib/sophtron/base-client.ts  — Base HTTP client
app/lib/sophtron/client.ts       — Full Sophtron V2 API client
app/lib/sophtron/types.ts        — TypeScript types
app/lib/sophtron/create-customer.ts — Auto-creates customer on sign-in
```

**Deployment:** Dockerfile at `apps/web/Dockerfile` (multi-stage build, Node 24 Alpine). GitHub Actions workflow (`.github/workflows/docker-publish.yml`) auto-builds Docker images daily if there are new commits.

## Shared Types

All domain types are in `packages/shared/src/types/index.ts`: `Transaction`, `Category`, `Account`, `Institution`, `BudgetBucket`, `Tag`, `UserSetting`, `UserProfile`, plus request/response types.

Constants (emoji mappings, tag colors) are in `packages/shared/src/constants/index.ts`.

## Mobile App Config

`app.config.ts` and `eas.json` are in `.gitignore` (contain bundle ID and project IDs). The app uses plugins: `expo-router`, `expo-secure-store`, `expo-sqlite`, `expo-document-picker`.

## Workflow Orchestration
### 1. Plan Mode
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `plan/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- From non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management
1. Plan First: Write plan to `plan/todo.md` with checkable items
2. Verify Plan: Check in before starting implementation
3. Track Progress: Mark items complete as you go
4. Explain Changes: High-level summary at each step
5. Document Results: Add review section to `plan/todo.md`
6. Capture Lessons: Update `plan/lessons.md` after corrections

## Core Principles
- Simplicity First: Make every change as simple as possible. Impact minimal code.
- No Laziness: Find root causes. No temporary fixes. Senior engineer standards.
- Minimal Impact: Change should only touch what is necessary. Avoid introducing bugs.
