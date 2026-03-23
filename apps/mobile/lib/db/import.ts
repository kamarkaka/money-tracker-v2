import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { getDatabase, uuid } from "./database";
import type { ExportData } from "./export";

export async function pickAndImport(): Promise<{
  success: boolean;
  message: string;
}> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { success: false, message: "No file selected" };
  }

  const file = new File(result.assets[0].uri);
  const content = await file.text();

  let data: ExportData;
  try {
    data = JSON.parse(content);
  } catch {
    return { success: false, message: "Invalid JSON file" };
  }

  if (!data.version || !data.data) {
    return { success: false, message: "Invalid export format" };
  }

  return importData(data);
}

export async function importData(
  data: ExportData,
): Promise<{ success: boolean; message: string }> {
  const db = await getDatabase();

  try {
    // Clear all existing data
    await db.execAsync(`
      DELETE FROM transaction_tags;
      DELETE FROM transactions;
      DELETE FROM budget_categories;
      DELETE FROM budgets;
      DELETE FROM category_rules;
      DELETE FROM accounts;
      DELETE FROM institutions;
      DELETE FROM categories;
      DELETE FROM tags;
    `);

    const d = data.data;

    // Import institutions
    for (const inst of d.institutions) {
      await db.runAsync(
        "INSERT INTO institutions (id, name, is_manual) VALUES (?, ?, ?)",
        [inst.id, inst.name, inst.isManual ? 1 : 0],
      );
    }

    // Import accounts
    for (const acct of d.accounts) {
      await db.runAsync(
        `INSERT INTO accounts (id, institution_id, name, type, subtype, balance, currency, is_hidden, is_manual)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          acct.id,
          acct.institutionId,
          acct.name,
          acct.type,
          acct.subtype,
          acct.balance,
          acct.currency,
          acct.isHidden ? 1 : 0,
          acct.isManual ? 1 : 0,
        ],
      );
    }

    // Import categories (parents first, then children)
    const parentCats = d.categories.filter((c) => !c.parentId);
    const childCats = d.categories.filter((c) => c.parentId);
    for (const cat of [...parentCats, ...childCats]) {
      await db.runAsync(
        "INSERT INTO categories (id, name, emoji, parent_id) VALUES (?, ?, ?, ?)",
        [cat.id, cat.name, cat.emoji, cat.parentId],
      );
    }

    // Import tags
    for (const tag of d.tags) {
      await db.runAsync(
        "INSERT INTO tags (id, name, color) VALUES (?, ?, ?)",
        [tag.id, tag.name, tag.color],
      );
    }

    // Import transactions
    for (const tx of d.transactions) {
      await db.runAsync(
        `INSERT INTO transactions (id, account_id, category_id, description, amount, date, is_hidden, is_manual)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tx.id,
          tx.accountId,
          tx.categoryId,
          tx.description,
          tx.amount,
          tx.date,
          tx.isHidden ? 1 : 0,
          tx.isManual ? 1 : 0,
        ],
      );

      // Import transaction tags
      for (const tagId of tx.tagIds || []) {
        await db.runAsync(
          "INSERT OR IGNORE INTO transaction_tags (id, transaction_id, tag_id) VALUES (?, ?, ?)",
          [uuid(), tx.id, tagId],
        );
      }
    }

    // Import budgets
    for (const budget of d.budgets) {
      await db.runAsync(
        "INSERT INTO budgets (id, name, icon, amount) VALUES (?, ?, ?, ?)",
        [budget.id, budget.name, budget.icon, budget.amount],
      );
      for (const catId of budget.categoryIds || []) {
        await db.runAsync(
          "INSERT OR IGNORE INTO budget_categories (id, budget_id, category_id) VALUES (?, ?, ?)",
          [uuid(), budget.id, catId],
        );
      }
    }

    // Import category rules
    for (const rule of d.categoryRules || []) {
      await db.runAsync(
        "INSERT INTO category_rules (id, sequence, match, category_id) VALUES (?, ?, ?, ?)",
        [rule.id, rule.sequence, rule.match, rule.categoryId],
      );
    }

    // Import settings
    if (d.settings) {
      await db.runAsync(
        "UPDATE settings SET theme = ?, language = ?, mode = ? WHERE id = 'default'",
        [d.settings.theme, d.settings.language, d.settings.mode],
      );
    }

    const txCount = d.transactions.length;
    return {
      success: true,
      message: `Imported ${txCount} transactions, ${d.categories.length} categories, ${d.accounts.length} accounts`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
