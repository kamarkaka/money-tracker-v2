# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Money Tracker 2 is a personal finance tracking app with two frontends (web + mobile) sharing code through a monorepo. The mobile app stores all data locally on-device (SQLite); the web app uses PostgreSQL via Prisma.

## Monorepo Structure

```
apps/web/          — Next.js 16 web app (NextAuth, Prisma, PostgreSQL)
apps/mobile/       — Expo/React Native iOS app (local-first, SQLite)
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
lib/db/database.ts    — SQLite schema, initialization, seeding
lib/db/local-client.ts — LocalClient: routes API paths to SQLite queries
lib/db/export.ts      — Export all tables as CSV files in a ZIP
lib/db/import.ts      — Import ZIP of CSV files into SQLite
lib/api.ts            — Exports LocalClient instance as `apiClient`
```

**Data flow:** Screen → `createXxxApi(apiClient)` → `apiClient.get("/api/xxx")` → `LocalClient.request()` → SQLite query → response shaped to match API types.

**i18n:** `lib/i18n.tsx` with JSON files in `assets/i18n/{en,zh}.json`. Use `i18n("key.path")` for translations.

**Theme:** `lib/themeContext.ts` + `lib/theme.ts`. Brand color is `#10b981` (green), used for the FAB, active tabs, selected month pills.

## Web App Architecture

Next.js App Router at `apps/web/app/`. API routes at `app/api/`. Prisma schema at `prisma/schema.prisma`. Auth via NextAuth with JWT for mobile clients (`app/lib/auth-mobile.ts`).

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
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessions until mistake rate drops
- Review lessions at session start for relevant project

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
1. Plan First: Write plan to `tasks/todo.md` with checkable items
2. Verify Plan: Check in before starting implementation
3. Track Progress: Mark items complete as you go
4. Explain Changes: High-level summary at each step
5. Document Results: Add review section to `tasks/todo.md`
6. Capture Lessons: Update `tasks/lessons.md` after corrections

## Core Principles
- Simplicity First: Make every change as simple as possible. Impact minimal code.
- No Laziness: Find root causes. No temporary fixes. Senior engineer standards.
- Minimal Impact: Change should only touch what is necessary. Avoid introducing bugs.
