import type { SQLiteDatabase } from "expo-sqlite";
import { uuid } from "@/lib/db";
import type {
  BackendExchangeResult,
  BackendSyncResult,
  BackendInstitution,
  BackendAccount,
  BackendTransaction,
} from "./backend-client";

/**
 * Ingest backend exchange result (initial link) into local SQLite.
 * Creates institution, accounts, and transactions from the backend response.
 */
export async function ingestBackendExchange(
  db: SQLiteDatabase,
  data: BackendExchangeResult,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM institutions WHERE plaid_item_id = ?",
      [data.institution.plaidItemId],
    );

    let institutionId: string;
    if (existing) {
      institutionId = existing.id;
      await db.runAsync(
        "UPDATE institutions SET name = ?, plaid_backend_managed = 1, updated_at = datetime('now') WHERE id = ?",
        [data.institution.name, institutionId],
      );
    } else {
      institutionId = uuid();
      await db.runAsync(
        `INSERT INTO institutions (id, name, is_manual, plaid_item_id, plaid_institution_id, plaid_backend_managed)
         VALUES (?, ?, 0, ?, ?, 1)`,
        [institutionId, data.institution.name, data.institution.plaidItemId, data.institution.plaidInstitutionId],
      );
    }

    await upsertAccounts(db, data.accounts, institutionId);
    await upsertTransactions(db, data.transactions.added, data.accounts);
  });
}

/**
 * Ingest backend sync result (incremental refresh) into local SQLite.
 */
export async function ingestBackendSync(
  db: SQLiteDatabase,
  institutionId: string,
  data: BackendSyncResult,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await upsertAccounts(db, data.accounts, institutionId);
    await upsertTransactions(db, data.transactions.added, data.accounts);
    await updateTransactions(db, data.transactions.modified);
    await removeTransactions(db, data.transactions.removedIds);

    await db.runAsync(
      "UPDATE institutions SET plaid_last_synced_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
      [institutionId],
    );
  });
}

/**
 * Ingest full institution list from backend (for hydration after login).
 */
export async function ingestBackendInstitutions(
  db: SQLiteDatabase,
  institutions: BackendInstitution[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const inst of institutions) {
      const existing = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM institutions WHERE plaid_item_id = ?",
        [inst.plaidItemId],
      );

      let institutionId: string;
      if (existing) {
        institutionId = existing.id;
        await db.runAsync(
          "UPDATE institutions SET name = ?, plaid_backend_managed = 1, updated_at = datetime('now') WHERE id = ?",
          [inst.name, institutionId],
        );
      } else {
        institutionId = uuid();
        await db.runAsync(
          `INSERT INTO institutions (id, name, is_manual, plaid_item_id, plaid_institution_id, plaid_backend_managed)
           VALUES (?, ?, 0, ?, ?, 1)`,
          [institutionId, inst.name, inst.plaidItemId, inst.plaidInstitutionId],
        );
      }

      await upsertAccounts(db, inst.accounts, institutionId);
    }
  });
}

// ── Helpers ──

async function upsertAccounts(
  db: SQLiteDatabase,
  accounts: BackendAccount[],
  institutionId: string,
): Promise<void> {
  for (const acct of accounts) {
    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM accounts WHERE plaid_account_id = ?",
      [acct.plaidAccountId],
    );

    if (existing) {
      await db.runAsync(
        "UPDATE accounts SET name = ?, type = ?, subtype = ?, balance = ?, updated_at = datetime('now') WHERE id = ?",
        [acct.name, acct.type, acct.subtype || null, acct.balance, existing.id],
      );
    } else {
      await db.runAsync(
        `INSERT INTO accounts (id, institution_id, name, type, subtype, balance, currency, is_hidden, is_manual, plaid_account_id)
         VALUES (?, ?, ?, ?, ?, ?, 'USD', 0, 0, ?)`,
        [uuid(), institutionId, acct.name, acct.type, acct.subtype || null, acct.balance, acct.plaidAccountId],
      );
    }
  }
}

async function upsertTransactions(
  db: SQLiteDatabase,
  transactions: BackendTransaction[],
  accounts: BackendAccount[],
): Promise<void> {
  // Load category rules for auto-categorization
  const rules = await db.getAllAsync<{ category_id: string; match: string }>(
    "SELECT category_id, match FROM category_rules ORDER BY sequence",
  );

  for (const tx of transactions) {
    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM transactions WHERE plaid_transaction_id = ?",
      [tx.plaidTransactionId],
    );
    if (existing) continue;

    const account = await db.getFirstAsync<{ id: string; is_hidden: number }>(
      "SELECT id, is_hidden FROM accounts WHERE plaid_account_id = ?",
      [tx.plaidAccountId],
    );
    if (!account) continue;

    // Apply category rules
    const lower = tx.description.toLowerCase();
    let categoryId: string | null = null;
    for (const rule of rules) {
      if (lower.includes(rule.match.toLowerCase())) {
        categoryId = rule.category_id;
        break;
      }
    }

    await db.runAsync(
      `INSERT INTO transactions (id, account_id, category_id, description, amount, date, is_hidden, is_manual, plaid_transaction_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [uuid(), account.id, categoryId, tx.description, tx.amount, tx.date, account.is_hidden, tx.plaidTransactionId],
    );
  }
}

async function updateTransactions(
  db: SQLiteDatabase,
  transactions: BackendTransaction[],
): Promise<void> {
  for (const tx of transactions) {
    const existing = await db.getFirstAsync<{ id: string; category_id: string | null }>(
      "SELECT id, category_id FROM transactions WHERE plaid_transaction_id = ?",
      [tx.plaidTransactionId],
    );
    if (!existing) continue;

    await db.runAsync(
      "UPDATE transactions SET description = ?, amount = ?, date = ?, updated_at = datetime('now') WHERE id = ?",
      [tx.description, tx.amount, tx.date, existing.id],
    );
  }
}

async function removeTransactions(
  db: SQLiteDatabase,
  plaidTransactionIds: string[],
): Promise<void> {
  for (const plaidTxId of plaidTransactionIds) {
    await db.runAsync(
      "DELETE FROM transactions WHERE plaid_transaction_id = ?",
      [plaidTxId],
    );
  }
}
