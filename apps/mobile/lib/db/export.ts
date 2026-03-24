import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";
import { getDatabase } from "./database";

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function exportToFile(): Promise<void> {
  const db = await getDatabase();

  const tables: { name: string; query: string }[] = [
    { name: "institutions", query: "SELECT * FROM institutions" },
    { name: "accounts", query: "SELECT * FROM accounts" },
    { name: "categories", query: "SELECT * FROM categories" },
    { name: "transactions", query: "SELECT * FROM transactions" },
    { name: "tags", query: "SELECT * FROM tags" },
    { name: "transaction_tags", query: "SELECT * FROM transaction_tags" },
    { name: "budgets", query: "SELECT * FROM budgets" },
    { name: "budget_categories", query: "SELECT * FROM budget_categories" },
    {
      name: "category_rules",
      query: "SELECT * FROM category_rules ORDER BY sequence",
    },
    {
      name: "settings",
      query: "SELECT * FROM settings WHERE id = 'default'",
    },
  ];

  // Build zip in memory
  const blobWriter = new BlobWriter("application/zip");
  const zipWriter = new ZipWriter(blobWriter);

  for (const table of tables) {
    const rows = await db.getAllAsync<Record<string, unknown>>(table.query);
    if (rows.length === 0) {
      // Write empty CSV with no headers
      await zipWriter.add(`${table.name}.csv`, new TextReader(""));
      continue;
    }
    const headers = Object.keys(rows[0]);
    const csv = toCsv(headers, rows);
    await zipWriter.add(`${table.name}.csv`, new TextReader(csv));
  }

  await zipWriter.close();
  const blob = await blobWriter.getData();

  // Convert blob to base64 and write to file
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 8192;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }
  const base64 = btoa(chunks.join(""));

  const filename = `money-tracker-export-${new Date().toISOString().split("T")[0]}.zip`;
  const file = new File(Paths.cache, filename);
  file.create();
  file.write(base64, { encoding: "base64" });

  await Sharing.shareAsync(file.uri, {
    mimeType: "application/zip",
    dialogTitle: "Export Money Tracker Data",
    UTI: "public.zip-archive",
  });
}
