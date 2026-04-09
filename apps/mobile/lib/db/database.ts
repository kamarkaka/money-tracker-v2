import * as SQLite from "expo-sqlite";
import { EMOJI_TO_NAME } from "@money-tracker/shared";

let db: SQLite.SQLiteDatabase | null = null;

export function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("moneytracker.db");
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS institutions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_manual INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'checking',
      subtype TEXT,
      balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      is_hidden INTEGER NOT NULL DEFAULT 0,
      is_manual INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT,
      parent_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      category_id TEXT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      is_manual INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transaction_tags (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
      UNIQUE(transaction_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      amount REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budget_categories (
      id TEXT PRIMARY KEY,
      budget_id TEXT NOT NULL,
      category_id TEXT NOT NULL UNIQUE,
      FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS category_rules (
      id TEXT PRIMARY KEY,
      sequence INTEGER NOT NULL DEFAULT 0,
      match TEXT NOT NULL,
      category_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      theme TEXT NOT NULL DEFAULT 'system',
      language TEXT NOT NULL DEFAULT 'auto',
      mode TEXT NOT NULL DEFAULT 'casual'
    );

    CREATE TABLE IF NOT EXISTS profile (
      id TEXT PRIMARY KEY DEFAULT 'default',
      name TEXT,
      email TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_accounts_institution ON accounts(institution_id);
    CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
  `);

  // Migrations for existing databases
  try {
    await database.runAsync("ALTER TABLE settings ADD COLUMN tab_config TEXT DEFAULT 'overview,transactions,budgets,accounts'");
    await database.runAsync("ALTER TABLE settings ADD COLUMN fireworks INTEGER DEFAULT 1");
  } catch {
    // Column already exists
  }

  try {
    await database.runAsync("ALTER TABLE settings ADD COLUMN checklist_dismissed INTEGER DEFAULT 0");
  } catch {
    // Column already exists
  }

  // Plaid integration columns
  const plaidMigrations = [
    "ALTER TABLE institutions ADD COLUMN plaid_item_id TEXT",
    "ALTER TABLE institutions ADD COLUMN plaid_institution_id TEXT",
    "ALTER TABLE institutions ADD COLUMN plaid_sync_cursor TEXT",
    "ALTER TABLE accounts ADD COLUMN plaid_account_id TEXT",
    "ALTER TABLE transactions ADD COLUMN plaid_transaction_id TEXT",
    "ALTER TABLE institutions ADD COLUMN plaid_last_synced_at TEXT",
    "ALTER TABLE institutions ADD COLUMN plaid_backend_managed INTEGER DEFAULT 0",
  ];
  for (const sql of plaidMigrations) {
    try { await database.runAsync(sql); } catch { /* Column already exists */ }
  }

  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_institutions_plaid_item ON institutions(plaid_item_id);
    CREATE INDEX IF NOT EXISTS idx_accounts_plaid_id ON accounts(plaid_account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_plaid_id ON transactions(plaid_transaction_id);
  `);


  // Seed defaults if empty
  await database.runAsync(
    `INSERT OR IGNORE INTO settings (id) VALUES ('default')`,
  );
  await database.runAsync(
    `INSERT OR IGNORE INTO profile (id, name, email) VALUES ('default', 'User', '')`,
  );

  // Seed default institution + account if none exist
  const instCount = await database.getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) as c FROM institutions",
  );
  if (!instCount || instCount.c === 0) {
    const instId = uuid();
    const acctId = uuid();
    await database.runAsync(
      "INSERT INTO institutions (id, name, is_manual) VALUES (?, ?, 1)",
      [instId, "Personal"],
    );
    await database.runAsync(
      "INSERT INTO accounts (id, institution_id, name, type, is_manual) VALUES (?, ?, ?, ?, 1)",
      [acctId, instId, "Cash", "checking"],
    );
  }

  // Seed default categories if none exist
  const catCount = await database.getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) as c FROM categories",
  );
  if (!catCount || catCount.c === 0) {
    for (const [emoji, name] of Object.entries(EMOJI_TO_NAME)) {
      await database.runAsync(
        "INSERT INTO categories (id, name, emoji) VALUES (?, ?, ?)",
        [uuid(), name, emoji],
      );
    }
  }
}
