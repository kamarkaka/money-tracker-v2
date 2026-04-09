import type { SQLiteDatabase } from "expo-sqlite";
import { uuid } from "@/lib/db";
import {
  getAccounts,
  getInstitutionName,
  syncTransactions,
  type PlaidAccount,
  type PlaidTransaction,
} from "./api";
import { getPlaidToken, deletePlaidToken, getPlaidCredentials } from "./storage";

// ── Quota configuration ──────────────────────────────────

/** Total points granted per month */
export const PLAID_MONTHLY_QUOTA = 300;
/** Points reserved per linked institution each month */
export const PLAID_LINK_COST = 30;
/** Points deducted per manual refresh (after the free one) */
export const PLAID_REFRESH_COST = 13;
/** Minimum hours between paid refreshes per institution */
export const PLAID_REFRESH_COOLDOWN_HOURS = 24;

// ── Account type mapping ──────────────────────────────────

function mapAccountType(plaidType: string): string {
  switch (plaidType) {
    case "depository":
      return "checking";
    case "credit":
      return "credit";
    case "investment":
      return "investment";
    case "loan":
      return "loan";
    default:
      return "checking";
  }
}

function mapAccountSubtype(
  plaidType: string,
  plaidSubtype: string | null,
): string {
  if (plaidType === "depository" && plaidSubtype === "savings")
    return "savings";
  return mapAccountType(plaidType);
}

// ── Quota management ─────────────────────────────────────

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Ensure quota is initialized for the current month.
 * If the stored month differs, reset points to MONTHLY_QUOTA minus
 * LINK_COST per linked institution.
 * Returns the current remaining points.
 */
async function ensureQuota(db: SQLiteDatabase): Promise<number> {
  const month = currentMonth();
  const row = await db.getFirstAsync<{
    plaid_quota_month: string | null;
    plaid_quota_points: number | null;
  }>("SELECT plaid_quota_month, plaid_quota_points FROM settings WHERE id = 'default'");

  if (row?.plaid_quota_month === month && row.plaid_quota_points != null) {
    return row.plaid_quota_points;
  }

  // Reset for new month
  const linked = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM institutions WHERE plaid_item_id IS NOT NULL",
  );
  const points = PLAID_MONTHLY_QUOTA - PLAID_LINK_COST * (linked?.count ?? 0);

  await db.runAsync(
    "UPDATE settings SET plaid_quota_month = ?, plaid_quota_points = ? WHERE id = 'default'",
    [month, points],
  );

  console.log(
    `[Plaid] Quota reset for ${month}: ${points} points (${PLAID_MONTHLY_QUOTA} - ${linked?.count ?? 0} × ${PLAID_LINK_COST})`,
  );
  return points;
}

async function deductQuota(db: SQLiteDatabase, amount: number): Promise<number> {
  await db.runAsync(
    "UPDATE settings SET plaid_quota_points = plaid_quota_points - ? WHERE id = 'default'",
    [amount],
  );
  const row = await db.getFirstAsync<{ plaid_quota_points: number }>(
    "SELECT plaid_quota_points FROM settings WHERE id = 'default'",
  );
  return row?.plaid_quota_points ?? 0;
}

// ── Initial sync (after linking) ──────────────────────────

export async function syncPlaidItem(
  db: SQLiteDatabase,
  itemId: string,
  institutionName: string,
  accessToken: string,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    // 1. Upsert institution
    const existing = await db.getFirstAsync<{
      id: string;
    }>("SELECT id FROM institutions WHERE plaid_item_id = ?", [itemId]);

    let institutionId: string;
    if (existing) {
      institutionId = existing.id;
      await db.runAsync(
        "UPDATE institutions SET name = ?, updated_at = datetime('now') WHERE id = ?",
        [institutionName, institutionId],
      );
    } else {
      institutionId = uuid();
      await db.runAsync(
        "INSERT INTO institutions (id, name, is_manual, plaid_item_id) VALUES (?, ?, 0, ?)",
        [institutionId, institutionName, itemId],
      );
    }

    // 2. Load credentials
    const creds = await getPlaidCredentials();
    if (!creds) throw new Error("Plaid credentials not configured");

    // 3. Sync accounts
    const { accounts } = await getAccounts(creds, accessToken);
    await syncAccountsToDb(db, accounts, institutionId);

    // 4. Sync transactions
    const result = await syncTransactions(creds, accessToken);
    await syncTransactionsToDb(db, result.added, result.modified, result.removed);

    // 4. Save cursor and last synced timestamp
    await db.runAsync(
      "UPDATE institutions SET plaid_sync_cursor = ?, plaid_last_synced_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
      [result.nextCursor, institutionId],
    );

    // 5. Deduct link cost from quota
    await ensureQuota(db);
    const remaining = await deductQuota(db, PLAID_LINK_COST);
    console.log(
      `[Plaid] Link cost: ${PLAID_LINK_COST} points deducted, ${remaining} remaining`,
    );
  });
}

// ── Refresh (incremental sync) ────────────────────────────

export type RefreshResult = { added: number; updated: number } | null;

export async function refreshPlaidItem(
  db: SQLiteDatabase,
  institutionId: string,
): Promise<RefreshResult> {
  const inst = await db.getFirstAsync<{
    plaid_item_id: string;
    plaid_sync_cursor: string | null;
    plaid_last_synced_at: string | null;
    plaid_free_refresh_month: string | null;
  }>(
    "SELECT plaid_item_id, plaid_sync_cursor, plaid_last_synced_at, plaid_free_refresh_month FROM institutions WHERE id = ?",
    [institutionId],
  );

  if (!inst?.plaid_item_id) return null;

  // Check if quota bypass is enabled (dev mode)
  const bypass = await db.getFirstAsync<{ plaid_bypass_quota: number }>(
    "SELECT plaid_bypass_quota FROM settings WHERE id = 'default'",
  );
  const bypassQuota = bypass?.plaid_bypass_quota === 1;

  const month = currentMonth();
  const isFreeRefresh = inst.plaid_free_refresh_month !== month;

  // Initialize quota for the current month (accounts for linked institutions)
  const points = await ensureQuota(db);

  if (!bypassQuota && !isFreeRefresh) {
    // Check 24h cooldown (only applies after the free refresh)
    if (inst.plaid_last_synced_at && PLAID_REFRESH_COOLDOWN_HOURS > 0) {
      const lastSynced = new Date(inst.plaid_last_synced_at + "Z");
      const cooldownMs = PLAID_REFRESH_COOLDOWN_HOURS * 60 * 60 * 1000;
      const elapsed = Date.now() - lastSynced.getTime();
      if (elapsed < cooldownMs) {
        const remainingHrs = ((cooldownMs - elapsed) / (60 * 60 * 1000)).toFixed(1);
        const elapsedHrs = (elapsed / (60 * 60 * 1000)).toFixed(1);
        console.log(
          `[Plaid] Refresh skipped — cooldown: last synced ${elapsedHrs}h ago, next in ${remainingHrs}h`,
        );
        return null;
      }
    }

    if (points < PLAID_REFRESH_COST) {
      console.log(
        `[Plaid] Refresh skipped — insufficient quota: ${points} points remaining, need ${PLAID_REFRESH_COST}`,
      );
      return null;
    }
  }

  const accessToken = await getPlaidToken(inst.plaid_item_id);
  if (!accessToken) return null;

  const creds = await getPlaidCredentials();
  if (!creds) throw new Error("Plaid credentials not configured");

  if (bypassQuota) {
    console.log(`[Plaid] Quota bypass enabled — skipping quota/cooldown checks`);
  }

  let counts = { added: 0, updated: 0 };

  await db.withTransactionAsync(async () => {
    // Update account balances
    const { accounts } = await getAccounts(creds, accessToken);
    await syncAccountsToDb(db, accounts, institutionId);

    // Incremental transaction sync
    const result = await syncTransactions(
      creds,
      accessToken,
      inst.plaid_sync_cursor || undefined,
    );
    counts = await syncTransactionsToDb(db, result.added, result.modified, result.removed);

    // Update cursor and last synced timestamp
    await db.runAsync(
      "UPDATE institutions SET plaid_sync_cursor = ?, plaid_last_synced_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
      [result.nextCursor, institutionId],
    );

    if (isFreeRefresh) {
      // Mark free refresh as used for this month
      await db.runAsync(
        "UPDATE institutions SET plaid_free_refresh_month = ? WHERE id = ?",
        [month, institutionId],
      );
      console.log(`[Plaid] Free refresh for institution ${institutionId}`);
    } else {
      // Deduct points
      const remaining = await deductQuota(db, PLAID_REFRESH_COST);
      console.log(
        `[Plaid] Refresh for institution ${institutionId} — ${PLAID_REFRESH_COST} points deducted, ${remaining} remaining`,
      );
    }
  });

  return counts;
}

// ── Unlink ────────────────────────────────────────────────

export async function unlinkPlaidItem(
  db: SQLiteDatabase,
  institutionId: string,
): Promise<void> {
  const inst = await db.getFirstAsync<{ plaid_item_id: string | null }>(
    "SELECT plaid_item_id FROM institutions WHERE id = ?",
    [institutionId],
  );

  if (inst?.plaid_item_id) {
    await deletePlaidToken(inst.plaid_item_id);
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "UPDATE institutions SET plaid_item_id = NULL, plaid_institution_id = NULL, plaid_sync_cursor = NULL, is_manual = 1, updated_at = datetime('now') WHERE id = ?",
      [institutionId],
    );
    await db.runAsync(
      "UPDATE accounts SET plaid_account_id = NULL, is_manual = 1, updated_at = datetime('now') WHERE institution_id = ?",
      [institutionId],
    );
    await db.runAsync(
      `UPDATE transactions SET plaid_transaction_id = NULL, is_manual = 1, updated_at = datetime('now')
       WHERE account_id IN (SELECT id FROM accounts WHERE institution_id = ?)`,
      [institutionId],
    );
  });
}

// ── Helpers ───────────────────────────────────────────────

async function syncAccountsToDb(
  db: SQLiteDatabase,
  accounts: PlaidAccount[],
  institutionId: string,
): Promise<void> {
  for (const acct of accounts) {
    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM accounts WHERE plaid_account_id = ?",
      [acct.account_id],
    );

    const balance = acct.balances.current ?? acct.balances.available ?? 0;
    const type = mapAccountSubtype(acct.type, acct.subtype);

    if (existing) {
      await db.runAsync(
        "UPDATE accounts SET name = ?, type = ?, subtype = ?, balance = ?, updated_at = datetime('now') WHERE id = ?",
        [
          acct.name,
          type,
          acct.subtype || null,
          balance,
          existing.id,
        ],
      );
    } else {
      await db.runAsync(
        `INSERT INTO accounts (id, institution_id, name, type, subtype, balance, currency, is_hidden, is_manual, plaid_account_id)
         VALUES (?, ?, ?, ?, ?, ?, 'USD', 0, 0, ?)`,
        [
          uuid(),
          institutionId,
          acct.name,
          type,
          acct.subtype || null,
          balance,
          acct.account_id,
        ],
      );
    }
  }
}

async function syncTransactionsToDb(
  db: SQLiteDatabase,
  added: PlaidTransaction[],
  modified: PlaidTransaction[],
  removed: { transaction_id: string }[],
): Promise<{ added: number; updated: number }> {
  let addedCount = 0;
  let updatedCount = 0;

  // Load rules once for all transactions
  const rules = await db.getAllAsync<{ category_id: string; match: string }>(
    "SELECT category_id, match FROM category_rules ORDER BY sequence",
  );
  const matchRuleLocal = (desc: string): string | null => {
    const lower = desc.toLowerCase();
    for (const rule of rules) {
      if (lower.includes(rule.match.toLowerCase())) return rule.category_id;
    }
    return null;
  };

  for (const tx of added) {
    if (tx.pending) continue;

    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM transactions WHERE plaid_transaction_id = ?",
      [tx.transaction_id],
    );
    if (existing) continue;

    // Find the local account by plaid_account_id
    const account = await db.getFirstAsync<{
      id: string;
      is_hidden: number;
    }>(
      "SELECT id, is_hidden FROM accounts WHERE plaid_account_id = ?",
      [tx.account_id],
    );
    if (!account) continue;

    // Plaid: positive = money leaving (spending), negative = money entering (income)
    // App convention: negative = spending, positive = income
    const amount = -tx.amount;

    const description = tx.merchant_name || tx.name;
    const categoryId = matchRuleLocal(description);

    await db.runAsync(
      `INSERT INTO transactions (id, account_id, category_id, description, amount, date, is_hidden, is_manual, plaid_transaction_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        uuid(),
        account.id,
        categoryId,
        description,
        amount,
        tx.date,
        account.is_hidden,
        tx.transaction_id,
      ],
    );
    addedCount++;
  }

  // Modified transactions
  for (const tx of modified) {
    if (tx.pending) continue;

    const existing = await db.getFirstAsync<{ id: string; category_id: string | null }>(
      "SELECT id, category_id FROM transactions WHERE plaid_transaction_id = ?",
      [tx.transaction_id],
    );
    if (!existing) continue;

    const amount = -tx.amount;
    const description = tx.merchant_name || tx.name;

    // Apply rules if transaction has no category
    let categoryId = existing.category_id;
    if (!categoryId) {
      categoryId = matchRuleLocal(description);
    }

    await db.runAsync(
      "UPDATE transactions SET description = ?, amount = ?, date = ?, category_id = ?, updated_at = datetime('now') WHERE id = ?",
      [description, amount, tx.date, categoryId, existing.id],
    );
    updatedCount++;
  }

  // Removed transactions
  for (const tx of removed) {
    await db.runAsync(
      "DELETE FROM transactions WHERE plaid_transaction_id = ?",
      [tx.transaction_id],
    );
  }

  return { added: addedCount, updated: updatedCount };
}
