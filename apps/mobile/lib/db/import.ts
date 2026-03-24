import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { getDatabase, uuid } from "./database";

function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

// Minimal ZIP reader — reads STORE (uncompressed) entries
function readZip(data: Uint8Array): Record<string, string> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const decoder = new TextDecoder();
  const files: Record<string, string> = {};
  let offset = 0;

  while (offset < data.length - 4) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break; // Not a local file header

    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const name = decoder.decode(data.subarray(offset + 30, offset + 30 + nameLen));
    const dataStart = offset + 30 + nameLen + extraLen;
    const fileData = data.subarray(dataStart, dataStart + compressedSize);

    if (name.endsWith(".csv")) {
      const tableName = name.replace(".csv", "");
      files[tableName] = decoder.decode(fileData);
    }

    offset = dataStart + compressedSize;
  }

  return files;
}

export async function pickAndImport(): Promise<{
  success: boolean;
  message: string;
}> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/zip", "application/x-zip-compressed"],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { success: false, message: "No file selected" };
  }

  try {
    const file = new File(result.assets[0].uri);
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const csvMap = readZip(bytes);

    return importCsvData(csvMap);
  } catch (error) {
    return {
      success: false,
      message: `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function importCsvData(
  csvMap: Record<string, string>,
): Promise<{ success: boolean; message: string }> {
  const db = await getDatabase();

  try {
    await db.execAsync("BEGIN TRANSACTION");

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

    // Import institutions
    for (const row of parseCsv(csvMap.institutions || "")) {
      await db.runAsync(
        "INSERT INTO institutions (id, name, is_manual) VALUES (?, ?, ?)",
        [row.id, row.name, Number(row.is_manual)],
      );
    }

    // Import accounts
    for (const row of parseCsv(csvMap.accounts || "")) {
      await db.runAsync(
        `INSERT INTO accounts (id, institution_id, name, type, subtype, balance, currency, is_hidden, is_manual)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.institution_id,
          row.name,
          row.type,
          row.subtype || null,
          Number(row.balance),
          row.currency,
          Number(row.is_hidden),
          Number(row.is_manual),
        ],
      );
    }

    // Import categories (parents first, then children)
    const allCats = parseCsv(csvMap.categories || "");
    const parentCats = allCats.filter((c) => !c.parent_id);
    const childCats = allCats.filter((c) => c.parent_id);
    for (const row of [...parentCats, ...childCats]) {
      await db.runAsync(
        "INSERT INTO categories (id, name, emoji, parent_id) VALUES (?, ?, ?, ?)",
        [row.id, row.name, row.emoji || null, row.parent_id || null],
      );
    }

    // Import tags
    for (const row of parseCsv(csvMap.tags || "")) {
      await db.runAsync(
        "INSERT INTO tags (id, name, color) VALUES (?, ?, ?)",
        [row.id, row.name, row.color],
      );
    }

    // Import transactions
    const txRows = parseCsv(csvMap.transactions || "");
    for (const row of txRows) {
      await db.runAsync(
        `INSERT INTO transactions (id, account_id, category_id, description, amount, date, is_hidden, is_manual)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.account_id,
          row.category_id || null,
          row.description,
          Number(row.amount),
          row.date,
          Number(row.is_hidden),
          Number(row.is_manual),
        ],
      );
    }

    // Import transaction tags
    for (const row of parseCsv(csvMap.transaction_tags || "")) {
      await db.runAsync(
        "INSERT OR IGNORE INTO transaction_tags (id, transaction_id, tag_id) VALUES (?, ?, ?)",
        [row.id || uuid(), row.transaction_id, row.tag_id],
      );
    }

    // Import budgets
    for (const row of parseCsv(csvMap.budgets || "")) {
      await db.runAsync(
        "INSERT INTO budgets (id, name, icon, amount) VALUES (?, ?, ?, ?)",
        [row.id, row.name, row.icon || null, Number(row.amount)],
      );
    }

    // Import budget categories
    for (const row of parseCsv(csvMap.budget_categories || "")) {
      await db.runAsync(
        "INSERT OR IGNORE INTO budget_categories (id, budget_id, category_id) VALUES (?, ?, ?)",
        [row.id || uuid(), row.budget_id, row.category_id],
      );
    }

    // Import category rules
    for (const row of parseCsv(csvMap.category_rules || "")) {
      await db.runAsync(
        "INSERT INTO category_rules (id, sequence, match, category_id) VALUES (?, ?, ?, ?)",
        [row.id, Number(row.sequence), row.match, row.category_id],
      );
    }

    // Import settings
    const settingsRows = parseCsv(csvMap.settings || "");
    if (settingsRows.length > 0) {
      const s = settingsRows[0];
      await db.runAsync(
        "UPDATE settings SET theme = ?, language = ?, mode = ? WHERE id = 'default'",
        [s.theme || "system", s.language || "en", s.mode || "casual"],
      );
    }

    await db.execAsync("COMMIT");

    return {
      success: true,
      message: `Imported ${txRows.length} transactions, ${allCats.length} categories`,
    };
  } catch (error) {
    await db.execAsync("ROLLBACK").catch(() => {});
    return {
      success: false,
      message: `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
