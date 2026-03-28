# Plaid Integration — Mobile App (iOS Only)

## Overview

Add Plaid Link to the mobile app so users can connect bank accounts and automatically import transactions. No web backend changes. The mobile app calls the Plaid REST API directly.

### Architecture

```
Mobile App                                         Plaid API
    |                                                  |
    |-- POST /link/token/create (client_id+secret) --->|
    |<-- { link_token } -------------------------------|
    |                                                  |
    |-- [Plaid Link SDK opens, user selects bank] ---->|
    |<-- public_token + metadata ----------------------|
    |                                                  |
    |-- POST /item/public_token/exchange ------------->|
    |<-- { access_token, item_id } --------------------|
    |                                                  |
    |   [store access_token in SecureStore]             |
    |                                                  |
    |-- POST /accounts/get (access_token) ------------>|
    |<-- { accounts[] } -------------------------------|
    |                                                  |
    |-- POST /transactions/sync (access_token) ------->|
    |<-- { added[], modified[], removed[], cursor } ---|
    |                                                  |
    |   [upsert into SQLite]                           |
```

**Key insight:** The Plaid API is plain REST — all endpoints accept `client_id` and `secret` in the POST body. No server SDK required. The mobile app calls Plaid directly via `fetch`.

### Credential storage

- `client_id` and `secret` are stored in `app.config.ts` (already gitignored) and accessed via `expo-constants`.
- Plaid `access_token` (per linked institution) is stored in `expo-secure-store` (iOS Keychain).
- This is a personal finance app with a single user on their own device — acceptable security posture.

---

## Dependencies

### Mobile app (`apps/mobile`)
```bash
cd apps/mobile
npx expo install react-native-plaid-link-sdk
```
- `react-native-plaid-link-sdk` — Plaid Link UI for React Native (supports Expo with custom dev client)
- Requires rebuild: `npx expo run:ios`
- No new web dependencies

### Expo config (`app.config.ts`, already gitignored)
Add Plaid credentials and plugin:
```ts
export default {
  // ... existing config
  extra: {
    plaidClientId: "your-client-id",
    plaidSecret: "your-sandbox-or-production-secret",
    plaidEnv: "sandbox", // "sandbox" | "production"
  },
  plugins: [
    // ... existing plugins
    "react-native-plaid-link-sdk",
  ],
};
```

---

## Phase 1: Plaid API Client (Mobile)

### 1.1 Plaid REST client

**New file:** `apps/mobile/lib/plaid/api.ts`

A thin wrapper around `fetch` that calls the Plaid API directly. Reads `client_id`, `secret`, and environment from Expo Constants (`app.config.ts` extra).

```ts
import Constants from "expo-constants";

const { plaidClientId, plaidSecret, plaidEnv } = Constants.expoConfig?.extra ?? {};

const BASE_URL = plaidEnv === "production"
  ? "https://production.plaid.com"
  : "https://sandbox.plaid.com";

async function plaidRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: plaidClientId, secret: plaidSecret, ...body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(`Plaid error ${res.status}: ${err?.error_message ?? "Unknown"}`);
  }
  return res.json();
}
```

Exported functions:

| Function | Plaid endpoint | Purpose |
|----------|---------------|---------|
| `createLinkToken(clientUserId)` | `POST /link/token/create` | Get link_token to open Plaid Link |
| `exchangePublicToken(publicToken)` | `POST /item/public_token/exchange` | Exchange for access_token + item_id |
| `getAccounts(accessToken)` | `POST /accounts/get` | Fetch accounts for a linked item |
| `getInstitution(institutionId)` | `POST /institutions/get_by_id` | Get institution name |
| `syncTransactions(accessToken, cursor?)` | `POST /transactions/sync` | Incremental transaction sync |

### 1.2 Secure storage helpers

**New file:** `apps/mobile/lib/plaid/storage.ts`

```ts
import * as SecureStore from "expo-secure-store";

// Plaid access tokens, keyed by item_id
export async function savePlaidToken(itemId: string, accessToken: string): Promise<void>;
export async function getPlaidToken(itemId: string): Promise<string | null>;
export async function deletePlaidToken(itemId: string): Promise<void>;

// Persistent client_user_id for Plaid Link (generated once, reused)
export async function getOrCreateClientUserId(): Promise<string>;
```

---

## Phase 2: Database Changes

### 2.1 Schema migration in `database.ts`

Add columns via ALTER TABLE in the existing migration block (try/catch per ALTER for idempotency):

```sql
-- institutions table
ALTER TABLE institutions ADD COLUMN plaid_item_id TEXT;
ALTER TABLE institutions ADD COLUMN plaid_institution_id TEXT;
ALTER TABLE institutions ADD COLUMN plaid_sync_cursor TEXT;

-- accounts table
ALTER TABLE accounts ADD COLUMN plaid_account_id TEXT;

-- transactions table
ALTER TABLE transactions ADD COLUMN plaid_transaction_id TEXT;
```

### 2.2 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_institutions_plaid_item ON institutions(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_accounts_plaid_id ON accounts(plaid_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_plaid_id ON transactions(plaid_transaction_id);
```

---

## Phase 3: Plaid Link Flow

### 3.1 PlaidLink component

**New file:** `apps/mobile/components/PlaidLink.tsx`

A button component that handles the full link flow:

1. Call `getOrCreateClientUserId()` for a stable user ID
2. Call `createLinkToken(clientUserId)` to get a `link_token`
3. Open Plaid Link via `PlaidLink.open({ token: linkToken })` from `react-native-plaid-link-sdk`
4. **On success**: receive `public_token` + `metadata` (institution id/name)
   - Call `exchangePublicToken(publicToken)` to get `access_token` + `item_id`
   - Store `access_token` in SecureStore via `savePlaidToken(itemId, accessToken)`
   - Trigger initial sync (Phase 4)
   - Call `onSuccess` callback to refresh parent screen
5. **On exit/error**: show feedback, call `onDismiss` callback

Props: `onSuccess(itemId, institutionName)`, `onDismiss?()`.

---

## Phase 4: Sync Logic

### 4.1 Sync module

**New file:** `apps/mobile/lib/plaid/sync.ts`

Core function:

```ts
export async function syncPlaidItem(
  db: SQLiteDatabase,
  itemId: string,
  institutionName: string,
  accessToken: string,
): Promise<void>
```

**Sync flow:**

1. **Upsert institution**
   - `SELECT * FROM institutions WHERE plaid_item_id = ?`
   - If not found: `INSERT INTO institutions (id, name, is_manual, plaid_item_id, plaid_institution_id)`
   - If found: update `name`, `updated_at`

2. **Sync accounts** — call `getAccounts(accessToken)`
   - For each Plaid account:
     - Find existing by `plaid_account_id`, or create new
     - Map fields: `name`, `type` (depository->checking/savings, credit->credit, investment->investment, loan->loan), `subtype`, `balance`
     - Set `is_manual = 0`, link to parent `institution_id`

3. **Sync transactions** — call `syncTransactions(accessToken, cursor)`
   - Loop until `hasMore` is false
   - **Added**: upsert by `plaid_transaction_id`
     - Amount: Plaid uses positive = money leaving account (spending), negative = money entering (income). The app uses negative = spending. So: `amount = -plaidAmount`.
     - Apply auto-categorization rules (fetch rules once, match against `name`/`merchant_name`)
     - Set `is_manual = 0`, `is_hidden = account.is_hidden`
   - **Modified**: update existing by `plaid_transaction_id` (amount, date, description)
   - **Removed**: `DELETE FROM transactions WHERE plaid_transaction_id = ?`
   - Save final `nextCursor` to `institutions.plaid_sync_cursor`

4. **Wrap everything in `db.withTransactionAsync()`** for atomicity

### 4.2 Refresh function

```ts
export async function refreshPlaidItem(
  db: SQLiteDatabase,
  institutionId: string,
): Promise<void>
```

1. Look up `plaid_item_id` and `plaid_sync_cursor` from institutions table
2. Get `access_token` from SecureStore via `getPlaidToken(itemId)`
3. Call `getAccounts()` to update balances
4. Call `syncTransactions()` with stored cursor (incremental — only fetches changes since last sync)
5. Update `plaid_sync_cursor` and `updated_at`

### 4.3 Extend LocalClient

In `local-client.ts`, update the `POST /api/institution/:id/refresh` handler:

```ts
// Currently a no-op. Change to:
if (institution.plaid_item_id) {
  await refreshPlaidItem(this.db, id);
  // Return updated institution with accounts
}
// else: remain a no-op (manual institution)
```

---

## Phase 5: Mobile UI Changes

### 5.1 Accounts page (`pages/accounts.tsx`)

Add a "Link Bank Account" section above or alongside the existing manual "Add Account" form:

- **Segmented control or two buttons**: "Add Manually" (existing) | "Link Bank Account" (new)
- "Link Bank Account" renders the `<PlaidLink>` component
- After successful link + sync, refresh the institution/account list
- Show a loading overlay during initial sync ("Syncing accounts and transactions...")

### 5.2 Institution cards

Differentiate linked vs manual institutions visually:

- Linked institutions: show a bank/link icon badge and a **Refresh** button (circular arrow)
- Refresh button calls `refreshPlaidItem()`, shows spinner during sync
- Linked accounts display Plaid-synced balance (read-only, not editable)
- Show "Last synced: X ago" subtitle using `updated_at`

### 5.3 Unlink flow

Add "Unlink" option for Plaid institutions (long-press menu or swipe action):

1. Confirm dialog: "Unlink this institution? Your data will be kept but no longer auto-updated."
2. Delete `access_token` from SecureStore
3. Clear `plaid_item_id`, `plaid_institution_id`, `plaid_sync_cursor` from institution row
4. Clear `plaid_account_id` from child accounts
5. Clear `plaid_transaction_id` from child transactions
6. Set `is_manual = 1` on institution and accounts
7. Data remains in SQLite — institution becomes "manual"

### 5.4 Error handling

- **Network errors**: toast/alert with retry option
- **Token expired** (`ITEM_LOGIN_REQUIRED`): prompt user to re-link via Plaid Link update mode
- **Plaid API errors**: show error message from Plaid's `error_message` field

---

## Phase 6: i18n

Add keys to `assets/i18n/en.json` and `assets/i18n/zh.json`:

```
account.linkBank          "Link Bank Account" / "关联银行账户"
account.addManually       "Add Manually" / "手动添加"
account.linked            "Linked" / "已关联"
account.unlink            "Unlink" / "取消关联"
account.refresh           "Refresh" / "刷新"
account.syncing           "Syncing..." / "同步中..."
account.lastSynced        "Last synced: {time}" / "上次同步: {time}"
account.syncFailed        "Sync failed. Tap to retry." / "同步失败，点击重试"
account.unlinkConfirm     "Unlink this institution? ..." / "取消关联此机构？..."
account.linkSuccess       "Account linked successfully" / "账户关联成功"
```

---

## Testing Strategy

### Sandbox testing
- Use `plaidEnv: "sandbox"` in `app.config.ts`
- Plaid sandbox test credentials:
  - Username: `user_good`, Password: `pass_good` — successful link
  - Username: `user_bad`, Password: `pass_bad` — credential failure
- Sandbox generates fake transactions automatically

### Edge cases
- [ ] Plaid Link dismissed without completing
- [ ] Network failure mid-sync (verify SQLite transaction rollback)
- [ ] Token expired (`ITEM_LOGIN_REQUIRED` error)
- [ ] Institution with 0 transactions
- [ ] Large transaction history (500+ transactions, cursor pagination)
- [ ] Re-linking same institution (dedup by `plaid_item_id`)
- [ ] Unlink then re-link same institution
- [ ] App reinstall (SecureStore may be wiped, SQLite has plaid IDs but no access_token — handle gracefully)
- [ ] Amount sign correctness: verify spending shows as negative, income as positive

---

## File Changes Summary

### New files (all in `apps/mobile/`)
```
lib/plaid/api.ts         — Plaid REST API client (direct fetch calls)
lib/plaid/storage.ts     — SecureStore helpers for access tokens
lib/plaid/sync.ts        — Sync logic (accounts + transactions into SQLite)
components/PlaidLink.tsx — Plaid Link button component
```

### Modified files (all in `apps/mobile/`)
```
package.json             — Add react-native-plaid-link-sdk
lib/db/database.ts       — Schema migration (new columns + indexes)
lib/db/local-client.ts   — Institution refresh routes to Plaid sync
app/pages/accounts.tsx   — "Link Bank Account" UI + linked institution cards
assets/i18n/en.json      — New i18n keys
assets/i18n/zh.json      — New i18n keys (Chinese)
app.config.ts            — Plaid credentials in extra + plugin registration
```

Zero web backend changes.

---

## Implementation Order

- [ ] **Step 1**: Add `react-native-plaid-link-sdk` dependency + Expo plugin config
- [ ] **Step 2**: Add Plaid credentials to `app.config.ts` extra
- [ ] **Step 3**: Build Plaid REST client (`lib/plaid/api.ts`) + storage helpers (`lib/plaid/storage.ts`)
- [ ] **Step 4**: SQLite schema migration — new columns + indexes (`lib/db/database.ts`)
- [ ] **Step 5**: Build sync module (`lib/plaid/sync.ts`)
- [ ] **Step 6**: Build PlaidLink component (`components/PlaidLink.tsx`)
- [ ] **Step 7**: Update accounts page UI (`pages/accounts.tsx`) — link, refresh, unlink
- [ ] **Step 8**: Extend LocalClient for Plaid refresh (`lib/db/local-client.ts`)
- [ ] **Step 9**: Add i18n keys
- [ ] **Step 10**: Rebuild iOS app (`npx expo run:ios`)
- [ ] **Step 11**: End-to-end testing with Plaid sandbox
- [ ] **Step 12**: Switch to production credentials and test with real bank
