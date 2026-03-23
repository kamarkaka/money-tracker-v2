# Cross-Platform Plan: iOS, Android, and Web

## Current Architecture Summary

The app is a Next.js 16 (App Router) + React 19 monolith with:
- **Backend**: Next.js API routes (`app/api/`) serving REST JSON endpoints, Prisma ORM with PostgreSQL
- **Frontend**: React client components using `"use client"`, fetching data via `fetch("/api/...")`
- **Auth**: NextAuth.js (JWT strategy) with credentials + Google OAuth
- **Styling**: Tailwind CSS 4 with custom CSS variables for theming (light/dark)
- **i18n**: `next-intl` with client-side locale switching (en, zh)
- **State**: No global state library -- components fetch data directly from API routes
- **Modes**: "casual" vs "pro" UI modes, stored in DB (`user_setting.mode`)

Key observation: **The frontend is already decoupled from the backend.** All pages are client components that call REST API endpoints. There are no Server Components rendering data inline (pages like `overview/page.tsx` and `transaction/page.tsx` are fully `"use client"`). The server-side rendering is limited to the dashboard layout which checks auth and renders `AppShell`.

---

## Recommended Approach: React Native + Shared API Backend

### Why React Native (not Flutter, PWA, or Capacitor)

| Option | Pros | Cons |
|--------|------|------|
| **React Native (Expo)** | Same language (TS), share business logic & types, large ecosystem, true native feel | Different UI components than web |
| Flutter | Good cross-platform UI | Different language (Dart), zero code sharing with existing TS codebase |
| Capacitor/Ionic | Wraps existing web app | Not truly native, limited iOS UX, poor performance for complex UIs |
| PWA | No app store, reuse web code | No push notifications (iOS limitations), no native feel, limited device APIs |

**React Native with Expo** is the best fit because:
1. TypeScript throughout -- share types, utilities, API client, and business logic
2. React paradigm -- team already knows React hooks, state, component patterns
3. True native UI -- the user wants "UI improvement" for iOS, which requires native components
4. Expo simplifies builds, OTA updates, and device APIs

---

## Architecture

```
money-tracker-v2/
├── apps/
│   ├── web/                    # Next.js web app (existing, relocated)
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   ├── api/            # REST API routes (shared backend)
│   │   │   ├── components/
│   │   │   └── ...
│   │   ├── package.json
│   │   └── next.config.ts
│   │
│   └── mobile/                 # React Native (Expo) app
│       ├── app/                # Expo Router (file-based routing)
│       │   ├── (auth)/
│       │   ├── (tabs)/
│       │   └── _layout.tsx
│       ├── components/
│       ├── package.json
│       ├── app.json
│       └── eas.json
│
├── packages/
│   ├── api-client/             # Shared API client (typed fetch wrapper)
│   │   ├── src/
│   │   │   ├── client.ts       # Base HTTP client with auth token handling
│   │   │   ├── transactions.ts # Transaction API methods
│   │   │   ├── categories.ts
│   │   │   ├── accounts.ts
│   │   │   ├── budgets.ts
│   │   │   └── auth.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared/                 # Shared types, constants, utilities
│   │   ├── src/
│   │   │   ├── types/          # TypeScript interfaces (Transaction, Category, etc.)
│   │   │   ├── utils.ts        # formatCurrency, formatDate, cn, etc.
│   │   │   ├── constants.ts    # Emoji maps, color constants, etc.
│   │   │   └── i18n/           # Shared translation strings
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── hooks/                  # Shared React hooks (platform-agnostic)
│       ├── src/
│       │   ├── useTransactions.ts
│       │   ├── useCategories.ts
│       │   ├── useBudgets.ts
│       │   ├── useAccounts.ts
│       │   └── useAuth.ts
│       ├── package.json
│       └── tsconfig.json
│
├── prisma/                     # Database schema (used by web backend only)
├── package.json                # Workspace root
└── turbo.json                  # Turborepo config
```

### What Goes Where

| Layer | Location | Shared? | Description |
|-------|----------|---------|-------------|
| **Database + ORM** | `apps/web/` only | No | Prisma stays server-side in the Next.js app |
| **API Routes** | `apps/web/app/api/` | Backend only | REST endpoints, no changes needed |
| **TypeScript Types** | `packages/shared/` | Yes | `Transaction`, `Category`, `Account`, etc. extracted from inline interfaces |
| **Utilities** | `packages/shared/` | Yes | `formatCurrency`, `formatDate`, `cn`, emoji maps, tag colors |
| **API Client** | `packages/api-client/` | Yes | Typed wrapper around `fetch()` -- same interface, different auth handling per platform |
| **React Hooks** | `packages/hooks/` | Yes | Data-fetching hooks like `useTransactions(filters)` -- contain business logic |
| **i18n Strings** | `packages/shared/` | Yes | Translation JSON files used by both platforms |
| **Web UI Components** | `apps/web/` | No | Tailwind-based React components (unchanged) |
| **Mobile UI Components** | `apps/mobile/` | No | React Native components with native styling |

---

## Detailed Plan

### Phase 1: Monorepo Setup & Code Extraction

**Goal**: Restructure into a monorepo without changing any functionality.

1. **Initialize Turborepo workspace**
   - Add `turbo.json` and root `package.json` with `"workspaces": ["apps/*", "packages/*"]`
   - Move existing code into `apps/web/`
   - Verify the web app builds and runs identically

2. **Extract `packages/shared`**
   - Move `app/lib/utils.ts` (formatCurrency, formatDate, cn) to `packages/shared/src/utils.ts`
   - Move `app/lib/emoji-categories.ts`, `app/lib/tag-colors.ts` to `packages/shared/src/constants/`
   - Move `app/i18n/config.ts` and `app/messages/*.json` to `packages/shared/src/i18n/`
   - Extract TypeScript interfaces currently defined inline in page components:
     - `Transaction`, `Category`, `Account`, `BudgetBucket`, `Tag`, `UserSetting`, etc.
     - Place in `packages/shared/src/types/`
   - Update imports in `apps/web` to use `@money-tracker/shared`

3. **Extract `packages/api-client`**
   - Create a typed API client that wraps fetch calls
   - Currently, every page component has its own `fetch("/api/...")` calls -- extract these into reusable functions:
     ```typescript
     // packages/api-client/src/transactions.ts
     export function getTransactions(filters: TransactionFilters): Promise<TransactionResponse>
     export function updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction>
     export function createTransaction(data: CreateTransactionInput): Promise<Transaction>
     ```
   - The client accepts a `baseUrl` and `getToken` function, so it works on both web (cookie-based, relative URLs) and mobile (token-based, absolute URLs)

4. **Extract `packages/hooks`**
   - Create data-fetching hooks that use the API client:
     ```typescript
     // packages/hooks/src/useTransactions.ts
     export function useTransactions(filters: TransactionFilters) {
       // Returns { data, loading, error, refetch }
     }
     ```
   - These hooks encapsulate the fetch-refetch-pagination logic currently duplicated across pages

### Phase 2: API Authentication for Mobile

**Goal**: Enable the existing API routes to serve mobile clients.

1. **Add token-based auth alongside session auth**
   - The current NextAuth JWT strategy already produces JWTs. The mobile app can:
     - Call a login endpoint to get a JWT
     - Send it as `Authorization: Bearer <token>` on subsequent requests
   - Add a small middleware or update the `auth()` helper to also check the `Authorization` header
   - This requires minimal changes to existing API routes (they already call `auth()` and check `session.user.id`)

2. **Add a dedicated mobile login endpoint**
   - `POST /api/auth/mobile/login` -- accepts email/password, returns JWT
   - `POST /api/auth/mobile/google` -- accepts Google ID token, returns JWT
   - `POST /api/auth/mobile/refresh` -- refreshes expiring tokens

3. **CORS configuration**
   - If the mobile app calls the API directly (not through a proxy), configure CORS in `next.config.ts`

### Phase 3: React Native App (Expo)

**Goal**: Build the iOS app with native UI, reusing shared packages.

1. **Initialize Expo project**
   - `npx create-expo-app apps/mobile --template blank-typescript`
   - Configure Expo Router for file-based navigation
   - Set up EAS Build for iOS (and later Android)

2. **App structure (Expo Router)**
   ```
   apps/mobile/app/
   ├── _layout.tsx              # Root layout (auth check, providers)
   ├── (auth)/
   │   ├── _layout.tsx
   │   ├── login.tsx
   │   └── register.tsx
   ├── (tabs)/
   │   ├── _layout.tsx          # Tab navigator
   │   ├── overview.tsx         # Overview/home tab
   │   ├── transactions.tsx     # Transaction list
   │   └── more.tsx             # Settings, categories, budgets, etc.
   └── modal/
       ├── add-transaction.tsx
       ├── edit-transaction.tsx
       └── category-picker.tsx
   ```

3. **Native UI components**
   - Use React Native's built-in components + a minimal library like `react-native-paper` or custom styled components
   - Key screens to build:
     - **Login/Register**: Native TextInputs, Apple Sign-In, Google Sign-In
     - **Overview**: ScrollView with budget cards, swipeable transaction rows
     - **Transaction List**: FlatList with infinite scroll (mirrors existing web behavior)
     - **Transaction Detail**: Bottom sheet or modal with category picker
     - **Settings**: Native-style grouped list
   - Leverage shared hooks: `useTransactions`, `useCategories`, etc.

4. **Auth handling on mobile**
   - Store JWT in `expo-secure-store`
   - Configure the API client with the stored token
   - Handle token refresh and logout

5. **Theme support**
   - Read system dark/light mode via `useColorScheme()`
   - Map to the same CSS variable values as the web app (translated to RN styles)

6. **i18n on mobile**
   - Use `expo-localization` + shared translation JSON from `packages/shared`
   - Can use `i18next` or a simple lookup function

### Phase 4: Feature Parity & Polish

1. **Push notifications** (optional, iOS-specific)
   - Use `expo-notifications` for transaction alerts

2. **Biometric auth**
   - `expo-local-authentication` for Face ID / Touch ID

3. **Haptic feedback**
   - `expo-haptics` for native-feel interactions

4. **Android build**
   - Expo/EAS handles Android builds from the same codebase
   - Minimal platform-specific code needed (mostly styling tweaks)

---

## What Changes When You Add a Feature

| Change Type | Files to Touch |
|-------------|---------------|
| New API endpoint | `apps/web/app/api/` only |
| New data type | `packages/shared/src/types/` (shared), then UI in both `apps/web` and `apps/mobile` |
| New business logic (e.g., budget calculation) | `packages/shared/` or `packages/hooks/` (shared) |
| UI-only change (web) | `apps/web/` only |
| UI-only change (mobile) | `apps/mobile/` only |
| New feature end-to-end | API route + shared types/hooks + platform-specific UI (2 UIs, but all logic shared) |

The key insight: **business logic and data access are shared; only the visual layer is platform-specific.** A typical new feature requires changes in 2 places (web UI + mobile UI), not 3, because the backend, types, API client, and hooks are shared.

---

## Migration Strategy (Minimal Disruption)

The restructuring is **backward-compatible** at each step:

1. **Phase 1** is purely organizational. The web app continues to work identically. No user-facing changes.
2. **Phase 2** adds new auth endpoints alongside existing ones. Existing web auth is untouched.
3. **Phase 3** is additive -- a new app that consumes the existing API.
4. At no point does the existing web app break or need downtime.

---

## Tooling

| Tool | Purpose |
|------|---------|
| **Turborepo** | Monorepo build orchestration, shared caching |
| **Expo** | React Native framework, OTA updates, EAS Build |
| **Expo Router** | File-based routing (consistent with Next.js mental model) |
| **expo-secure-store** | Secure token storage on device |
| **TypeScript** | End-to-end type safety across all packages |

---

## Estimated Effort by Phase

| Phase | Scope |
|-------|-------|
| Phase 1 | Monorepo restructure + package extraction |
| Phase 2 | Mobile auth endpoints (small) |
| Phase 3 | React Native app with core screens |
| Phase 4 | Polish, notifications, biometrics, Android |

Phase 1 can begin immediately with no risk to the existing app. Phases 2 and 3 can proceed in parallel. Phase 4 is iterative polish.
