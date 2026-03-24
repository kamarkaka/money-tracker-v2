import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
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

// Minimal ZIP builder — no compression (STORE method), sufficient for CSV text
function buildZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const entries: { name: Uint8Array; data: Uint8Array; offset: number }[] = [];
  const parts: Uint8Array[] = [];
  let offset = 0;

  const encoder = new TextEncoder();

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.data);

    // Local file header (30 bytes + name + data)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0, true); // flags
    lv.setUint16(8, 0, true); // compression (STORE)
    lv.setUint16(10, 0, true); // mod time
    lv.setUint16(12, 0, true); // mod date
    lv.setUint32(14, crc, true); // crc32
    lv.setUint32(18, file.data.length, true); // compressed size
    lv.setUint32(22, file.data.length, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true); // name length
    lv.setUint16(28, 0, true); // extra length
    localHeader.set(nameBytes, 30);

    entries.push({ name: nameBytes, data: file.data, offset });
    parts.push(localHeader);
    parts.push(file.data);
    offset += localHeader.length + file.data.length;
  }

  // Central directory
  const centralStart = offset;
  for (const entry of entries) {
    const cdHeader = new Uint8Array(46 + entry.name.length);
    const cv = new DataView(cdHeader.buffer);
    const crc = crc32(entry.data);
    cv.setUint32(0, 0x02014b50, true); // signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0, true); // flags
    cv.setUint16(10, 0, true); // compression
    cv.setUint16(12, 0, true); // mod time
    cv.setUint16(14, 0, true); // mod date
    cv.setUint32(16, crc, true); // crc32
    cv.setUint32(20, entry.data.length, true); // compressed size
    cv.setUint32(24, entry.data.length, true); // uncompressed size
    cv.setUint16(28, entry.name.length, true); // name length
    cv.setUint16(30, 0, true); // extra length
    cv.setUint16(32, 0, true); // comment length
    cv.setUint16(34, 0, true); // disk number
    cv.setUint16(36, 0, true); // internal attrs
    cv.setUint32(38, 0, true); // external attrs
    cv.setUint32(42, entry.offset, true); // local header offset
    cdHeader.set(entry.name, 46);
    parts.push(cdHeader);
    offset += cdHeader.length;
  }

  const centralSize = offset - centralStart;

  // End of central directory
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // signature
  ev.setUint16(4, 0, true); // disk number
  ev.setUint16(6, 0, true); // central dir disk
  ev.setUint16(8, entries.length, true); // entries on disk
  ev.setUint16(10, entries.length, true); // total entries
  ev.setUint32(12, centralSize, true); // central dir size
  ev.setUint32(16, centralStart, true); // central dir offset
  ev.setUint16(20, 0, true); // comment length
  parts.push(eocd);

  // Concatenate
  const totalSize = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.length;
  }
  return result;
}

// CRC32 lookup table
const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crc32Table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export async function exportToFile(): Promise<void> {
  const db = await getDatabase();
  const encoder = new TextEncoder();

  const tables: { name: string; query: string }[] = [
    { name: "institutions", query: "SELECT * FROM institutions" },
    { name: "accounts", query: "SELECT * FROM accounts" },
    { name: "categories", query: "SELECT * FROM categories" },
    { name: "transactions", query: "SELECT * FROM transactions" },
    { name: "tags", query: "SELECT * FROM tags" },
    { name: "transaction_tags", query: "SELECT * FROM transaction_tags" },
    { name: "budgets", query: "SELECT * FROM budgets" },
    { name: "budget_categories", query: "SELECT * FROM budget_categories" },
    { name: "category_rules", query: "SELECT * FROM category_rules ORDER BY sequence" },
    { name: "settings", query: "SELECT * FROM settings WHERE id = 'default'" },
  ];

  const zipFiles: { name: string; data: Uint8Array }[] = [];

  for (const table of tables) {
    const rows = await db.getAllAsync<Record<string, unknown>>(table.query);
    let csv = "";
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      csv = toCsv(headers, rows);
    }
    zipFiles.push({ name: `${table.name}.csv`, data: encoder.encode(csv) });
  }

  const zipBytes = buildZip(zipFiles);

  // Convert to base64
  const chunkSize = 8192;
  const chunks: string[] = [];
  for (let i = 0; i < zipBytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...zipBytes.subarray(i, i + chunkSize)));
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
