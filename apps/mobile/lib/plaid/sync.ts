import type { SQLiteDatabase } from "expo-sqlite";
import { uuid } from "@/lib/db";
import {
  getAccounts,
  getInstitutionName,
  syncTransactions,
  type PlaidAccount,
  type PlaidTransaction,
} from "./api";
import { getPlaidToken, deletePlaidToken } from "./storage";

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

// ── Rule matching ─────────────────────────────────────────

async function matchRule(
  db: SQLiteDatabase,
  description: string,
): Promise<string | null> {
  const rules = await db.getAllAsync<{
    category_id: string;
    match: string;
  }>("SELECT category_id, match FROM category_rules ORDER BY sequence");

  const lower = description.toLowerCase();
  for (const rule of rules) {
    if (lower.includes(rule.match.toLowerCase())) {
      return rule.category_id;
    }
  }
  return null;
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

    // 2. Sync accounts
    const { accounts } = await getAccounts(accessToken);
    await syncAccountsToDb(db, accounts, institutionId);

    // 3. Sync transactions
    const result = await syncTransactions(accessToken);
    await syncTransactionsToDb(db, result.added, result.modified, result.removed);

    // 4. Save cursor
    await db.runAsync(
      "UPDATE institutions SET plaid_sync_cursor = ?, updated_at = datetime('now') WHERE id = ?",
      [result.nextCursor, institutionId],
    );
  });
}

// ── Refresh (incremental sync) ────────────────────────────

export async function refreshPlaidItem(
  db: SQLiteDatabase,
  institutionId: string,
): Promise<void> {
  const inst = await db.getFirstAsync<{
    plaid_item_id: string;
    plaid_sync_cursor: string | null;
  }>(
    "SELECT plaid_item_id, plaid_sync_cursor FROM institutions WHERE id = ?",
    [institutionId],
  );

  if (!inst?.plaid_item_id) return;

  const accessToken = await getPlaidToken(inst.plaid_item_id);
  if (!accessToken) return;

  await db.withTransactionAsync(async () => {
    // Update account balances
    const { accounts } = await getAccounts(accessToken);
    await syncAccountsToDb(db, accounts, institutionId);

    // Incremental transaction sync
    const result = await syncTransactions(
      accessToken,
      inst.plaid_sync_cursor || undefined,
    );
    await syncTransactionsToDb(db, result.added, result.modified, result.removed);

    // Update cursor
    await db.runAsync(
      "UPDATE institutions SET plaid_sync_cursor = ?, updated_at = datetime('now') WHERE id = ?",
      [result.nextCursor, institutionId],
    );
  });
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
): Promise<void> {
  // Added transactions
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
    const categoryId = await matchRule(db, description);

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
  }

  // Modified transactions
  for (const tx of modified) {
    if (tx.pending) continue;

    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM transactions WHERE plaid_transaction_id = ?",
      [tx.transaction_id],
    );
    if (!existing) continue;

    const amount = -tx.amount;
    const description = tx.merchant_name || tx.name;

    await db.runAsync(
      "UPDATE transactions SET description = ?, amount = ?, date = ?, updated_at = datetime('now') WHERE id = ?",
      [description, amount, tx.date, existing.id],
    );
  }

  // Removed transactions
  for (const tx of removed) {
    await db.runAsync(
      "DELETE FROM transactions WHERE plaid_transaction_id = ?",
      [tx.transaction_id],
    );
  }
}
