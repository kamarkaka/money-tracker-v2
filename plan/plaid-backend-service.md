# Plaid Backend Proxy Service

## Context

Currently, mobile users must supply their own Plaid developer credentials (`client_id` + `secret`) to link bank accounts. The app calls Plaid APIs directly from the device. This creates a high barrier to entry — most users don't have (and shouldn't need) a Plaid developer account.

This plan adds a standalone backend Plaid proxy service (`apps/plaid-server/`) — an Express app with its own Prisma/PostgreSQL database, fully separate from the web app. Pro subscribers can authenticate with the backend and link bank accounts through our server-managed Plaid credentials. The existing direct-Plaid mode remains for power users who prefer their own credentials.

**Goal:** Two Plaid modes on mobile — direct (existing) and backend (new, gated behind auth + subscription).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Mobile App                                             │
│                                                         │
│  PlaidLink component ──┬── Mode: direct ──► Plaid API   │
│                        │   (user's own credentials)     │
│                        │                                │
│                        └── Mode: backend ──► Next.js ──►│Plaid API
│                             (JWT auth)       server     │(our credentials)
│                                                │        │
│  Local SQLite ◄────────── formatted data ◄─────┘        │
└─────────────────────────────────────────────────────────┘
```

**Key principle:** The backend handles Plaid communication and returns data in the app's format. The mobile app stores everything in local SQLite just like direct mode — zero UI changes needed.

---

## Phase 1: Database Schema

Add Plaid columns to existing Prisma models (paralleling the Sophtron columns) and a new `PlaidItem` model for server-side access token storage.

**File:** `apps/web/prisma/schema.prisma`

### 1a. `PlaidItem` model (new)

Stores encrypted Plaid access tokens server-side. One per linked bank.

```prisma
model PlaidItem {
  id              String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String      @map("user_id") @db.Uuid
  plaidItemId     String      @unique @map("plaid_item_id") @db.VarChar(255)
  accessToken     String      @map("access_token") @db.VarChar(500) // AES-256-GCM encrypted
  institutionId   String?     @map("institution_id") @db.Uuid
  syncCursor      String?     @map("sync_cursor")
  lastSyncedAt    DateTime?   @map("last_synced_at") @db.Timestamptz(6)
  createdAt       DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime    @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  institution     Institution? @relation(fields: [institutionId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@map("plaid_item")
}
```

### 1b. Add Plaid columns to existing models

**Institution:**
```prisma
plaidItemId         String?    @map("plaid_item_id") @db.VarChar(255)
plaidInstitutionId  String?    @map("plaid_institution_id") @db.VarChar(255)
plaidItems          PlaidItem[]
```

**Account:**
```prisma
plaidAccountId      String?    @map("plaid_account_id") @db.VarChar(255)
@@unique([userId, plaidAccountId])
```

**Transaction:**
```prisma
plaidTransactionId  String?    @map("plaid_transaction_id") @db.VarChar(255)
@@unique([userId, plaidTransactionId])
@@index([plaidTransactionId])
```

### 1c. Subscription verification fields on User

```prisma
appleOriginalTransactionId   String?    @unique @map("apple_original_transaction_id") @db.VarChar(255)
appleSubscriptionExpiresAt   DateTime?  @map("apple_subscription_expires_at") @db.Timestamptz(6)
appleSubscriptionProductId   String?    @map("apple_subscription_product_id") @db.VarChar(100)
appleSubscriptionStatus      String?    @map("apple_subscription_status") @db.VarChar(20) // "active", "expired", "revoked"
plaidItems                   PlaidItem[]
```

### 1d. Migration

```bash
cd apps/web && npx prisma migrate dev --name add-plaid-backend
```

---

## Phase 2: Server-Side Plaid Client Library

Create `apps/web/app/lib/plaid/` (paralleling `apps/web/app/lib/sophtron/`).

### 2a. `client.ts` — Plaid REST API client

Reads from env vars: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` (sandbox|production).

```typescript
class PlaidClient {
  createLinkToken(clientUserId: string): Promise<string>
  exchangePublicToken(publicToken: string): Promise<{ accessToken: string; itemId: string }>
  getAccounts(accessToken: string): Promise<{ accounts: PlaidAccount[]; institutionId: string | null }>
  getInstitutionName(institutionId: string): Promise<string>
  syncTransactions(accessToken: string, cursor?: string): Promise<SyncResult>
  removeItem(accessToken: string): Promise<void>
}
```

This mirrors the 5 functions in `apps/mobile/lib/plaid/api.ts` plus `removeItem` for unlinking. Reuse the same types: `PlaidAccount`, `PlaidTransaction`, `SyncResult`.

### 2b. `crypto.ts` — Access token encryption

AES-256-GCM using Node.js `crypto` module. Key from `PLAID_TOKEN_ENCRYPTION_KEY` env var (32-byte hex).

```typescript
function encryptToken(plaintext: string): string   // returns iv:ciphertext:tag (base64)
function decryptToken(encrypted: string): string
```

### 2c. `types.ts` — Shared Plaid types

Copy `PlaidAccount`, `PlaidTransaction`, `SyncResult` interfaces from mobile `lib/plaid/api.ts`. These should eventually move to `packages/shared/` but can start here.

### 2d. `sync.ts` — Prisma sync logic

Maps Plaid data to Prisma models. Follows the pattern in `apps/web/app/api/sophtron/connect/save/route.ts`.

```typescript
// Mirrors mobile lib/plaid/sync.ts but with Prisma instead of SQLite
function syncAccountsToDb(userId: string, plaidAccounts: PlaidAccount[], institutionId: string): Promise<Account[]>
function syncTransactionsToDb(userId: string, added: PlaidTransaction[], modified: PlaidTransaction[], removed: { transaction_id: string }[]): Promise<{ added: number; modified: number; removed: number }>
```

Key behaviors to preserve from mobile sync:
- Account type mapping: `depository` → `checking`, `credit` → `credit`, etc.
- Amount sign inversion: `amount = -plaidAmount` (Plaid positive = spending, app positive = income)
- Description: `merchant_name || name`
- Skip pending transactions
- Apply category rules via `getUserRules()` + `matchRuleFromList()` from `apps/web/app/lib/rules.ts`
- Inherit `isHidden` from account
- Dedup by `plaidTransactionId`

---

## Phase 3: Apple Subscription Verification

### 3a. `apps/web/app/lib/plaid/subscription.ts`

Verifies Apple StoreKit 2 JWS signed transactions using the `jose` library (already a dependency).

```typescript
async function verifyAppleJWS(jws: string): Promise<AppleTransactionPayload>
function isSubscriptionActive(user: { appleSubscriptionExpiresAt: Date | null }): boolean
async function requireActiveSubscription(userId: string): Promise<void>  // throws 403 if expired
```

**JWS verification flow:**
1. Fetch Apple's JWK Set from `https://appleid.apple.com/auth/keys` (cache for 24h)
2. Verify JWS signature using `jose.jwtVerify()` with Apple's public keys
3. Validate payload: `bundleId === APPLE_BUNDLE_ID`, `productId` is one of our product IDs, `expiresDate > now`
4. Return extracted payload

**`requireActiveSubscription` middleware** — called at the top of every Plaid API route:
- Loads user's `appleSubscriptionExpiresAt`
- If null or expired, returns 403 `{ error: "subscription_required", code: "SUBSCRIPTION_EXPIRED" }`
- Mobile app catches this code and triggers re-verification

### 3b. `POST /api/plaid/verify-subscription`

**File:** `apps/web/app/api/plaid/verify-subscription/route.ts`

```
Request:  { jws: string }  // JWS signed transaction from react-native-iap
Response: { verified: true, expiresAt: string, productId: string }
          | { error: string }
```

- Auth required (existing `auth()` + mobile JWT)
- Verifies JWS → extracts subscription data → updates User record
- Rate limit: 10/min per user

---

## Phase 4: Backend Plaid API Routes

All under `/api/plaid/`. All require auth + active subscription (except verify-subscription).

### 4a. `POST /api/plaid/link-token`

**File:** `apps/web/app/api/plaid/link-token/route.ts`

```
Response: { linkToken: string }
```

- Calls `PlaidClient.createLinkToken(userId)`
- Uses server's own Plaid credentials
- Rate limit: 5/min

### 4b. `POST /api/plaid/exchange`

**File:** `apps/web/app/api/plaid/exchange/route.ts`

```
Request:  { publicToken: string, institutionName?: string }
Response: {
  institution: { id, name, plaidItemId },
  accounts: [{ id, name, type, subtype, balance }],
  transactions: { added: number, modified: number, removed: number }
}
```

This is the heavy endpoint — does token exchange + initial sync in one call:
1. `exchangePublicToken()` → get access token + item ID
2. Encrypt access token → store in `PlaidItem`
3. `getAccounts()` → look up institution name if not provided → upsert Institution + Accounts
4. `syncTransactions()` → upsert Transactions with category rule matching
5. Save sync cursor on `PlaidItem`
6. Return formatted data for mobile to store locally
- Rate limit: 3/min

### 4c. `POST /api/plaid/sync`

**File:** `apps/web/app/api/plaid/sync/route.ts`

```
Request:  { institutionId: string }
Response: {
  accounts: [{ id, name, type, subtype, balance, plaidAccountId }],
  transactions: { added: number, modified: number, removed: number },
  addedTransactions: [...],
  modifiedTransactions: [...],
  removedTransactionIds: [...]
}
```

Incremental sync using stored cursor:
1. Look up `PlaidItem` by institution → decrypt access token
2. `getAccounts()` → update balances
3. `syncTransactions(cursor)` → process added/modified/removed
4. Update cursor on `PlaidItem`
5. Return changes for mobile to apply locally
- Rate limit: 5/hour per institution, 20/hour per user

### 4d. `GET /api/plaid/institutions`

**File:** `apps/web/app/api/plaid/institutions/route.ts`

```
Response: [{
  id, name, plaidItemId, plaidInstitutionId, lastSyncedAt,
  accounts: [{ id, name, type, subtype, balance, plaidAccountId }]
}]
```

Returns all Plaid-linked institutions with their accounts. Mobile uses this to hydrate local SQLite on first login or after re-authentication.

### 4e. `DELETE /api/plaid/institutions/[id]`

**File:** `apps/web/app/api/plaid/institutions/[id]/route.ts`

```
Response: { success: true }
```

1. Look up `PlaidItem` → decrypt access token
2. Call `PlaidClient.removeItem(accessToken)` to invalidate at Plaid
3. Delete `PlaidItem` record
4. Set institution to manual mode (clear Plaid fields, `isManual = true`)

---

## Phase 5: Mobile — Backend Client & Mode Detection

### 5a. `apps/mobile/lib/auth-backend.ts` — Backend auth manager

Manages JWT token storage and auth state for backend communication.

```typescript
async function getAuthToken(): Promise<string | null>        // from SecureStore
async function saveAuthToken(token: string): Promise<void>
async function clearAuthToken(): Promise<void>
async function isAuthenticated(): Promise<boolean>
async function getBackendBaseUrl(): Promise<string>          // from settings or env
```

SecureStore key: `"backend_auth_token"`

### 5b. `apps/mobile/lib/plaid/backend-client.ts` — Backend Plaid proxy client

Calls our backend API instead of Plaid directly. Uses `fetch` with JWT Bearer auth.

```typescript
async function createLinkTokenViaBackend(baseUrl: string, token: string): Promise<string>
async function exchangeViaBackend(baseUrl: string, token: string, publicToken: string, institutionName?: string): Promise<BackendExchangeResult>
async function syncViaBackend(baseUrl: string, token: string, institutionId: string): Promise<BackendSyncResult>
async function getBackendInstitutions(baseUrl: string, token: string): Promise<BackendInstitution[]>
async function unlinkViaBackend(baseUrl: string, token: string, institutionId: string): Promise<void>
async function verifySubscriptionViaBackend(baseUrl: string, token: string, jws: string): Promise<VerifyResult>
```

### 5c. `apps/mobile/lib/plaid/mode.ts` — Mode detection

```typescript
type PlaidMode = "direct" | "backend" | "none";

async function getPlaidMode(): Promise<PlaidMode> {
  // 1. Check for backend auth token → "backend"
  // 2. Check for own Plaid credentials → "direct"
  // 3. Neither → "none"
}
```

Backend mode takes priority when both exist (users who authenticate with backend shouldn't need their own credentials).

### 5d. `apps/mobile/lib/plaid/backend-sync.ts` — Ingest backend data into SQLite

Takes formatted responses from backend API and writes to local SQLite. Reuses the data shapes from `lib/plaid/sync.ts` helpers.

```typescript
async function ingestBackendExchange(db: SQLiteDatabase, data: BackendExchangeResult): Promise<void>
async function ingestBackendSync(db: SQLiteDatabase, institutionId: string, data: BackendSyncResult): Promise<void>
async function ingestBackendInstitutions(db: SQLiteDatabase, data: BackendInstitution[]): Promise<void>
```

---

## Phase 6: Mobile — UI Integration

### 6a. Update `components/PlaidLink.tsx`

The `PlaidLinkButton` component detects mode and uses the appropriate flow:

```
handlePress():
  mode = await getPlaidMode()

  if mode === "backend":
    linkToken = await createLinkTokenViaBackend(...)
    open Plaid Link SDK (same native UI)
    on success: await exchangeViaBackend(publicToken, institutionName)
    ingestBackendExchange(db, result)

  if mode === "direct":
    (existing flow unchanged)

  if mode === "none":
    show alert prompting user to either log in or enter Plaid credentials
```

The Plaid Link SDK UI is identical in both modes — only the token source and post-link processing differ.

### 6b. Update `lib/db/local-client.ts` — `refreshInstitution()`

The refresh handler checks which mode to use based on whether the institution has backend-managed Plaid data:

```typescript
async refreshInstitution(id: string) {
  const inst = await db.getFirstAsync(
    "SELECT plaid_item_id, plaid_backend_managed FROM institutions WHERE id = ?", [id]
  );

  if (inst.plaid_backend_managed) {
    // Backend mode: call server for incremental sync
    const result = await syncViaBackend(baseUrl, token, id);
    await ingestBackendSync(db, id, result);
  } else if (inst.plaid_item_id) {
    // Direct mode: existing refreshPlaidItem() call
    await refreshPlaidItem(db, id);
  }
}
```

Add a `plaid_backend_managed INTEGER DEFAULT 0` column to the SQLite `institutions` table to distinguish backend-linked from direct-linked institutions.

### 6c. Update `app/pages/settings.tsx`

The Plaid configuration card shows three states:

1. **Authenticated with backend:** "Connected via Money Tracker Pro" — no credential inputs, show backend URL
2. **Own credentials configured:** Current UI (client ID + secret fields)
3. **Neither:** Show both options — "Log in for automatic setup" button + manual credential entry

Add a "Log In" / "Register" section that triggers the existing mobile auth endpoints.

### 6d. Update `lib/subscription.tsx`

After purchase or restore, if user is authenticated with backend:
1. Extract JWS from purchase object (`purchase.transactionReceipt`)
2. Call `verifySubscriptionViaBackend(baseUrl, token, jws)`
3. This tells the backend the subscription is active, enabling Plaid access

---

## Environment Variables

Add to `apps/web/.env.local`:

```
PLAID_CLIENT_ID=               # Our Plaid developer client ID
PLAID_SECRET=                  # Our Plaid developer secret
PLAID_ENV=sandbox              # sandbox or production
PLAID_TOKEN_ENCRYPTION_KEY=    # 32-byte hex string for AES-256-GCM
APPLE_BUNDLE_ID=xyz.mengcao.money-tracker-2
```

---

## Security Considerations

1. **Access tokens encrypted at rest** — AES-256-GCM before Prisma storage. Decrypted only for API calls.
2. **Subscription gating** — Every Plaid route calls `requireActiveSubscription()` first. 403 with code `SUBSCRIPTION_EXPIRED` triggers mobile re-verification.
3. **User isolation** — All Prisma queries include `userId`. Compound unique constraints prevent cross-user data access.
4. **Rate limiting** — Per-user, per-institution limits on all mutation endpoints. Extends existing `rateLimit()` from `apps/web/app/lib/rate-limit.ts`.
5. **No credential exposure** — Server Plaid creds are env-only. Access tokens never reach the client. Mobile receives only formatted financial data.
6. **Auth via existing JWT** — Uses the `auth()` dual-mode function that already handles mobile Bearer tokens.

---

## Implementation Order

```
Phase 1: Prisma schema + migration
Phase 2: Server Plaid client library (client.ts, crypto.ts, types.ts, sync.ts)
Phase 3: Subscription verification (subscription.ts + /api/plaid/verify-subscription)
Phase 4: Backend API routes (link-token, exchange, sync, institutions, unlink)
Phase 5: Mobile backend client + mode detection + SQLite ingestion
Phase 6: Mobile UI (PlaidLink, settings, local-client, subscription integration)
```

Each phase is independently testable. Phases 1-4 are server-only (no mobile app changes). Phases 5-6 are mobile-only (server already working).

---

## Verification

### Server-side (Phases 1-4)
- Run `npx prisma migrate dev` and verify schema
- Test Plaid client against sandbox environment
- Test token encryption roundtrip
- Test subscription verification with sandbox Apple JWS
- Test each API route with `curl` using a mobile JWT
- Verify rate limiting behavior

### Mobile-side (Phases 5-6)
- Test backend auth flow (register → login → token storage)
- Test subscription JWS upload to backend
- Link a bank account via backend mode in Plaid sandbox
- Verify institution, accounts, and transactions appear in local SQLite
- Verify refresh works through backend
- Verify unlink works through backend
- Verify direct mode still works unchanged
- Test mode switching (sign out of backend → falls back to direct mode)
- Test expired subscription handling (403 → re-verify flow)

---

## Files to Create

```
apps/web/app/lib/plaid/client.ts
apps/web/app/lib/plaid/crypto.ts
apps/web/app/lib/plaid/types.ts
apps/web/app/lib/plaid/sync.ts
apps/web/app/lib/plaid/subscription.ts
apps/web/app/api/plaid/verify-subscription/route.ts
apps/web/app/api/plaid/link-token/route.ts
apps/web/app/api/plaid/exchange/route.ts
apps/web/app/api/plaid/sync/route.ts
apps/web/app/api/plaid/institutions/route.ts
apps/web/app/api/plaid/institutions/[id]/route.ts
apps/mobile/lib/auth-backend.ts
apps/mobile/lib/plaid/backend-client.ts
apps/mobile/lib/plaid/backend-sync.ts
apps/mobile/lib/plaid/mode.ts
```

## Files to Modify

```
apps/web/prisma/schema.prisma              — Add PlaidItem model, Plaid columns, subscription fields
apps/mobile/components/PlaidLink.tsx        — Dual mode support
apps/mobile/lib/db/local-client.ts         — Backend-aware refreshInstitution()
apps/mobile/lib/db/database.ts             — Add plaid_backend_managed column
apps/mobile/app/pages/settings.tsx         — Backend auth UI, mode display
apps/mobile/lib/subscription.tsx           — JWS upload to backend after purchase
```
