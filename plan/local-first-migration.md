# Local-First Data Storage for iOS App

## Current Architecture

The mobile app (`apps/mobile`) is a thin client — every screen calls the remote API via `packages/api-client` → `packages/hooks`. Data lives entirely in a PostgreSQL database behind the Next.js web app (`apps/web`). The mobile app authenticates via JWT and all CRUD goes through HTTP endpoints.

**Data entities** (from Prisma schema):
- Transactions (+ TransactionTags join table)
- Categories (hierarchical, parent/child)
- Accounts (belong to Institutions)
- Institutions
- Budgets (+ BudgetCategory join table)
- Tags
- CategoryRules
- UserSettings

---

## Proposed Architecture

**Local database**: Use **WatermelonDB** (built on SQLite, designed for React Native). It's the best fit for Expo/React Native — high performance, lazy loading, observable queries, and built-in sync protocol support if you ever want to add sync later.

**Export format**: **JSON** — a single `.json` file containing all user data. The web app already has a CSV import endpoint, but JSON is better here because:
- It preserves relational structure (category hierarchies, budget→category mappings, transaction→tag links)
- It's lossless — no escaping issues
- It can be directly consumed by a new web import API endpoint

---

## Implementation Plan

### Phase 1: Local Database Layer (`apps/mobile/lib/db/`)

1. **Install WatermelonDB** + configure for Expo
2. **Define schema** (`schema.ts`) — SQLite tables mirroring Prisma models:
   - `institutions` (id, name, is_manual)
   - `accounts` (id, institution_id, name, type, subtype, balance, currency, is_hidden, is_manual)
   - `categories` (id, name, emoji, parent_id)
   - `transactions` (id, account_id, category_id, description, amount, date, is_hidden, is_manual)
   - `tags` (id, name, color)
   - `transaction_tags` (id, transaction_id, tag_id)
   - `budgets` (id, name, icon, amount)
   - `budget_categories` (id, budget_id, category_id)
   - `category_rules` (id, sequence, match, category_id)
   - `settings` (id, theme, language, mode)
3. **Define WatermelonDB models** (`models/*.ts`) — one per table with relationships

### Phase 2: Local Data Repository (`apps/mobile/lib/db/repository.ts`)

Create a repository layer that replaces the API client for local operations:
- `transactions.list(filters)` → SQLite query with WHERE clauses
- `transactions.create(data)` → SQLite insert
- `transactions.update(id, data)` → SQLite update
- `transactions.remove(id)` → SQLite delete
- Same pattern for categories, accounts, budgets, tags, rules

This layer should implement the **same interface** as the current API functions (`createTransactionApi`, etc.) so the hooks layer doesn't need to change.

### Phase 3: Replace API Client with Local Repository

1. **Create `LocalDataClient`** — a drop-in replacement for `ApiClient` that routes to local SQLite instead of HTTP
2. **Update `apps/mobile/lib/api.ts`** — export local client instead of remote API client
3. **Update `apps/mobile/app/_layout.tsx`**:
   - Remove JWT auth flow (no more `signIn`/`signUp`/token management)
   - Remove `ApiClientContext` wrapping
   - Initialize WatermelonDB on app start
   - Seed default categories on first launch
4. **Update all screens** — they should work mostly unchanged since the hooks/API shape stays the same

### Phase 4: Auth Simplification

Since data is local, authentication is no longer needed for data access. Two options:
- **Option A (recommended)**: Remove auth entirely — the app is a personal device tool, no login needed
- **Option B**: Keep optional local PIN/biometric lock (if desired later)

Changes:
- Remove `(auth)/login.tsx`, `(auth)/register.tsx`
- Remove `AuthContext` and token management
- App launches directly to `(tabs)/overview`
- Profile page becomes a simple local settings page

### Phase 5: Export/Import Feature

**Export format** — a single JSON file:

```json
{
  "version": 1,
  "exportedAt": "2026-03-23T00:00:00Z",
  "data": {
    "institutions": [
      { "id": "...", "name": "Chase", "isManual": true }
    ],
    "accounts": [
      { "id": "...", "institutionId": "...", "name": "Checking", "type": "checking", "balance": 1000, "currency": "USD" }
    ],
    "categories": [
      { "id": "...", "name": "Food", "emoji": "🍔", "parentId": null },
      { "id": "...", "name": "Restaurants", "emoji": "🍽️", "parentId": "<parent-id>" }
    ],
    "transactions": [
      { "id": "...", "accountId": "...", "categoryId": "...", "description": "Grocery", "amount": -50.00, "date": "2026-03-20", "isHidden": false, "isManual": true, "tagIds": ["tag-id-1"] }
    ],
    "tags": [
      { "id": "...", "name": "vacation", "color": "#3b82f6" }
    ],
    "budgets": [
      { "id": "...", "name": "Essentials", "icon": "🏠", "amount": 2000, "categoryIds": ["cat-id-1", "cat-id-2"] }
    ],
    "categoryRules": [
      { "id": "...", "sequence": 0, "match": "starbucks", "categoryId": "..." }
    ],
    "settings": { "theme": "dark", "language": "en", "mode": "casual" }
  }
}
```

**Mobile export** (`apps/mobile/lib/db/export.ts`):
- Query all tables from SQLite
- Build the JSON structure above
- Use `expo-sharing` + `expo-file-system` to save/share the file

**Mobile import** (`apps/mobile/lib/db/import.ts`):
- Read JSON file via `expo-document-picker`
- Validate schema version
- Clear existing data (with user confirmation) or merge
- Insert all records into SQLite, preserving IDs for relationship integrity

**Web app import endpoint** (`apps/web/app/api/import/route.ts`):
- New POST endpoint that accepts the JSON format above
- Validates structure, creates all records in a Prisma transaction
- Resolves ID references (institution → account → transaction)
- This complements the existing CSV import (which is transaction-only)

**Web app export endpoint** (`apps/web/app/api/export/route.ts`):
- New GET endpoint that exports all user data in the same JSON format
- Allows web → mobile transfer too

### Phase 6: UI for Export/Import

Add to `apps/mobile/app/pages/settings.tsx`:
- "Export Data" button → generates JSON, opens share sheet
- "Import Data" button → file picker, confirmation dialog, imports

Add to web app settings page:
- "Export Data" button → downloads JSON file
- "Import from Mobile" option on the existing import page

---

## File Changes Summary

| Action | Files |
|--------|-------|
| **New** | `apps/mobile/lib/db/schema.ts`, `apps/mobile/lib/db/models/*.ts`, `apps/mobile/lib/db/index.ts`, `apps/mobile/lib/db/repository.ts`, `apps/mobile/lib/db/export.ts`, `apps/mobile/lib/db/import.ts`, `apps/web/app/api/import/route.ts`, `apps/web/app/api/export/route.ts` |
| **Major edit** | `apps/mobile/app/_layout.tsx` (remove auth, add DB init), `apps/mobile/lib/api.ts` (local client) |
| **Delete** | `apps/mobile/app/(auth)/_layout.tsx`, `apps/mobile/app/(auth)/login.tsx`, `apps/mobile/app/(auth)/register.tsx`, `apps/mobile/lib/auth.ts` |
| **Minor edit** | All screen files (remove direct `apiClient` imports, use local repository), `apps/mobile/app/pages/settings.tsx` (add export/import UI) |
| **Untouched** | `packages/shared` (types stay the same), `packages/api-client` (web app still uses it), `packages/hooks` (web app still uses it) |

---

## Migration Path for Existing Users

For users who already have data on the server:
1. First app launch after update detects empty local DB
2. Prompts user: "Import your data from the web app?"
3. One-time authenticated download from the new `/api/export` endpoint
4. Imports into local SQLite
5. After confirmation, user can optionally purge server data

---

## Key Design Decisions

- **WatermelonDB over raw SQLite**: Observable queries, lazy loading, React Native integration. Alternatives considered: `expo-sqlite` (too low-level), `realm` (heavier, requires account)
- **JSON over CSV**: CSV can't represent hierarchical relationships. JSON preserves the full data graph
- **No sync**: This is intentionally offline-only. Adding sync later is possible with WatermelonDB's sync protocol, but keeping it simple for now
- **Preserve type interfaces**: The `@money-tracker/shared` types remain the source of truth — the local repository just implements the same shapes
