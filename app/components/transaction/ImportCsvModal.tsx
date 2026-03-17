"use client";

import { useState, useRef } from "react";
import { Modal } from "@/app/components/ui/Modal";

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

type Step = "upload" | "map" | "done";

const DATE_FORMATS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
  { value: "MMM/DD/YYYY", label: "MMM/DD/YYYY (e.g. Feb/09/2026)" },
  { value: "MMM-DD-YYYY", label: "MMM-DD-YYYY (e.g. Feb-09-2026)" },
];

const COLUMN_ROLES = [
  { value: "", label: "Skip" },
  { value: "date", label: "Date" },
  { value: "description", label: "Description" },
  { value: "amount", label: "Amount" },
  { value: "debit", label: "Debit" },
  { value: "credit", label: "Credit" },
  { value: "category", label: "Category" },
  { value: "account", label: "Account" },
];

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(current);
        current = "";
      } else if (char === "\n" || (char === "\r" && text[i + 1] === "\n")) {
        row.push(current);
        current = "";
        if (row.some((c) => c.trim())) rows.push(row);
        row = [];
        if (char === "\r") i++;
      } else {
        current += char;
      }
    }
  }
  // Last row
  row.push(current);
  if (row.some((c) => c.trim())) rows.push(row);

  return rows;
}

// --- Content-based column auto-detection ---

const MONTH_ABBRS = new Set([
  "jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec",
]);

function tryParseDate(value: string, format: string): boolean {
  const clean = value.trim();
  if (!clean) return false;
  if (format === "YYYY-MM-DD") {
    const m = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) return false;
    const [, y, mo, d] = m.map(Number);
    return y > 1900 && y < 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31;
  }
  if (format === "MM/DD/YYYY") {
    const m = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!m) return false;
    const [, mo, d, y] = m.map(Number);
    return mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y > 0;
  }
  if (format === "DD/MM/YYYY") {
    const m = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!m) return false;
    const [, d, mo, y] = m.map(Number);
    return mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y > 0;
  }
  if (format === "MMM/DD/YYYY") {
    const parts = clean.split("/");
    if (parts.length !== 3) return false;
    return MONTH_ABBRS.has(parts[0].trim().toLowerCase().slice(0, 3));
  }
  if (format === "MMM-DD-YYYY") {
    const parts = clean.split("-");
    if (parts.length !== 3) return false;
    return MONTH_ABBRS.has(parts[0].trim().toLowerCase().slice(0, 3));
  }
  return false;
}

function scoreDateColumn(values: string[]): { score: number; format: string } {
  const nonEmpty = values.filter((v) => v.trim());
  if (nonEmpty.length === 0) return { score: 0, format: "MM/DD/YYYY" };
  let bestScore = 0;
  let bestFormat = "MM/DD/YYYY";
  for (const fmt of DATE_FORMATS) {
    const matched = nonEmpty.filter((v) => tryParseDate(v, fmt.value)).length;
    const ratio = matched / nonEmpty.length;
    if (ratio > bestScore) {
      bestScore = ratio;
      bestFormat = fmt.value;
    }
  }
  return { score: bestScore, format: bestFormat };
}

function parseNumericValue(value: string): number | null {
  const clean = value.trim();
  if (!clean) return null;
  // Handle parenthetical negatives: (50.00) → -50.00
  const parenMatch = clean.match(/^\(([0-9,. ]+)\)$/);
  const normalized = parenMatch
    ? "-" + parenMatch[1].replace(/[^0-9.\-]/g, "")
    : clean.replace(/[^0-9.\-+]/g, "");
  if (!normalized || normalized === "-" || normalized === "+") return null;
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

function scoreNumericColumn(values: string[]): {
  score: number;
  hasNegatives: boolean;
  hasMixed: boolean;
} {
  const nonEmpty = values.filter((v) => v.trim());
  if (nonEmpty.length === 0) return { score: 0, hasNegatives: false, hasMixed: false };
  let parsed = 0;
  let positives = 0;
  let negatives = 0;
  for (const v of nonEmpty) {
    const num = parseNumericValue(v);
    if (num !== null) {
      parsed++;
      if (num > 0) positives++;
      if (num < 0) negatives++;
    }
  }
  return {
    score: parsed / nonEmpty.length,
    hasNegatives: negatives > 0,
    hasMixed: positives > 0 && negatives > 0,
  };
}

function scoreDescriptionColumn(values: string[]): number {
  const nonEmpty = values.filter((v) => v.trim());
  if (nonEmpty.length === 0) return 0;
  // Must be mostly non-numeric, non-date text
  const textValues = nonEmpty.filter((v) => {
    if (parseNumericValue(v) !== null) return false;
    if (/^\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}$/.test(v.trim())) return false;
    return true;
  });
  const textRatio = textValues.length / nonEmpty.length;
  if (textRatio < 0.5) return 0;
  const unique = new Set(nonEmpty.map((v) => v.trim().toLowerCase()));
  const cardinality = unique.size / nonEmpty.length;
  const avgLen = nonEmpty.reduce((sum, v) => sum + v.trim().length, 0) / nonEmpty.length;
  const lenScore = Math.min(avgLen / 20, 1);
  return textRatio * 0.3 + cardinality * 0.4 + lenScore * 0.3;
}

function scoreCategoryColumn(values: string[], knownCategories: string[]): number {
  const nonEmpty = values.filter((v) => v.trim());
  if (nonEmpty.length === 0) return 0;
  const textValues = nonEmpty.filter((v) => parseNumericValue(v) === null);
  if (textValues.length / nonEmpty.length < 0.5) return 0;
  const unique = new Set(nonEmpty.map((v) => v.trim().toLowerCase()));
  const cardinality = unique.size / nonEmpty.length;
  const lowCardScore = Math.max(0, 1 - cardinality * 2);
  let overlapScore = 0;
  if (knownCategories.length > 0) {
    const knownSet = new Set(knownCategories.map((c) => c.toLowerCase()));
    const matched = [...unique].filter((v) => knownSet.has(v)).length;
    overlapScore = unique.size > 0 ? matched / unique.size : 0;
  }
  return lowCardScore * 0.5 + overlapScore * 0.5;
}

function scoreAccountColumn(values: string[], knownAccounts: string[]): number {
  const nonEmpty = values.filter((v) => v.trim());
  if (nonEmpty.length === 0) return 0;
  const textValues = nonEmpty.filter((v) => parseNumericValue(v) === null);
  if (textValues.length / nonEmpty.length < 0.5) return 0;
  const unique = new Set(nonEmpty.map((v) => v.trim().toLowerCase()));
  const veryLowCardScore = unique.size <= 5 ? 1 - unique.size / 10 : 0;
  let overlapScore = 0;
  if (knownAccounts.length > 0) {
    const knownSet = new Set(knownAccounts.map((a) => a.toLowerCase()));
    const matched = [...unique].filter((v) => knownSet.has(v)).length;
    overlapScore = unique.size > 0 ? matched / unique.size : 0;
  }
  return veryLowCardScore * 0.4 + overlapScore * 0.6;
}

const HEADER_HINTS: Record<string, string[]> = {
  date: ["date", "transaction date", "posted", "posting date", "txn date"],
  description: ["description", "memo", "payee", "narrative", "details", "transaction", "name"],
  amount: ["amount", "total", "sum"],
  debit: ["debit", "withdrawal", "debit amount", "money out"],
  credit: ["credit", "deposit", "credit amount", "money in"],
  category: ["category", "type", "label", "group"],
  account: ["account", "account name", "source"],
};

function headerBoost(header: string): Record<string, number> {
  const lower = header.toLowerCase().trim();
  const boosts: Record<string, number> = {};
  for (const [role, keywords] of Object.entries(HEADER_HINTS)) {
    if (keywords.some((kw) => lower === kw || lower.includes(kw))) {
      boosts[role] = 0.3;
    }
  }
  return boosts;
}

type Role = "date" | "description" | "amount" | "debit" | "credit" | "category" | "account";
const ALL_ROLES: Role[] = ["date", "description", "amount", "debit", "credit", "category", "account"];

interface InferResult {
  mapping: Record<string, string>;
  dateFormat: string;
}

function inferColumnMapping(
  dataRows: string[][],
  headers: string[] | null,
  knownCategories: string[],
  knownAccounts: string[],
): InferResult {
  if (dataRows.length === 0) return { mapping: {}, dateFormat: "MM/DD/YYYY" };

  const sampleRows = dataRows.slice(0, 20);
  const numCols = Math.max(...sampleRows.map((r) => r.length), headers?.length ?? 0);

  const scores: Record<string, number>[] = [];
  const dateFormats: string[] = [];
  const numericInfo: { hasNegatives: boolean; hasMixed: boolean }[] = [];
  let numericColCount = 0;

  for (let col = 0; col < numCols; col++) {
    const values = sampleRows.map((r) => r[col] ?? "");
    const colScores: Record<string, number> = {};

    const dateResult = scoreDateColumn(values);
    colScores.date = dateResult.score;
    dateFormats.push(dateResult.format);

    const numResult = scoreNumericColumn(values);
    if (numResult.score >= 0.6) numericColCount++;
    numericInfo.push({ hasNegatives: numResult.hasNegatives, hasMixed: numResult.hasMixed });
    colScores._numeric = numResult.score;

    colScores.description = scoreDescriptionColumn(values);
    colScores.category = scoreCategoryColumn(values, knownCategories);
    colScores.account = scoreAccountColumn(values, knownAccounts);

    if (headers && headers[col]) {
      const boosts = headerBoost(headers[col]);
      for (const [role, boost] of Object.entries(boosts)) {
        colScores[role] = (colScores[role] || 0) + boost;
      }
    }

    scores.push(colScores);
  }

  // Assign amount vs debit/credit based on how many numeric columns exist
  for (let col = 0; col < numCols; col++) {
    const rawNumeric = scores[col]._numeric || 0;
    delete scores[col]._numeric;

    if (numericColCount === 1) {
      scores[col].amount = rawNumeric;
      scores[col].debit = 0;
      scores[col].credit = 0;
    } else if (numericColCount >= 2 && rawNumeric >= 0.6) {
      if (numericInfo[col].hasMixed) {
        scores[col].amount = rawNumeric;
        scores[col].debit = rawNumeric * 0.3;
        scores[col].credit = rawNumeric * 0.3;
      } else {
        scores[col].amount = rawNumeric * 0.4;
        scores[col].debit = rawNumeric * 0.7;
        scores[col].credit = rawNumeric * 0.7;
      }
    } else {
      scores[col].amount = rawNumeric;
      scores[col].debit = rawNumeric;
      scores[col].credit = rawNumeric;
    }

    // Re-apply header boosts for amount/debit/credit
    if (headers && headers[col]) {
      const boosts = headerBoost(headers[col]);
      if (boosts.amount) scores[col].amount = (scores[col].amount || 0) + boosts.amount;
      if (boosts.debit) scores[col].debit = (scores[col].debit || 0) + boosts.debit;
      if (boosts.credit) scores[col].credit = (scores[col].credit || 0) + boosts.credit;
    }
  }

  // Greedy assignment
  const mapping: Record<string, string> = {};
  const assignedCols = new Set<number>();
  const assignedRoles = new Set<string>();

  type Candidate = { role: Role; col: number; score: number };
  const candidates: Candidate[] = [];
  for (let col = 0; col < numCols; col++) {
    for (const role of ALL_ROLES) {
      const score = scores[col][role] || 0;
      if (score > 0) candidates.push({ role, col, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const MIN_THRESHOLD: Record<string, number> = {
    date: 0.4, description: 0.2, amount: 0.4,
    debit: 0.4, credit: 0.4, category: 0.3, account: 0.3,
  };

  for (const { role, col, score } of candidates) {
    if (assignedCols.has(col) || assignedRoles.has(role)) continue;
    if (score < (MIN_THRESHOLD[role] || 0.3)) continue;
    if (role === "amount" && (assignedRoles.has("debit") || assignedRoles.has("credit"))) continue;
    if ((role === "debit" || role === "credit") && assignedRoles.has("amount")) continue;

    mapping[String(col)] = role;
    assignedCols.add(col);
    assignedRoles.add(role);
  }

  let bestDateFormat = "MM/DD/YYYY";
  for (const [colStr, role] of Object.entries(mapping)) {
    if (role === "date") {
      bestDateFormat = dateFormats[parseInt(colStr, 10)] || "MM/DD/YYYY";
      break;
    }
  }

  return { mapping, dateFormat: bestDateFormat };
}

interface ImportCsvModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  accounts: Account[];
  categories: Category[];
}

export function ImportCsvModal({ open, onClose, onComplete, accounts, categories }: ImportCsvModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [allRows, setAllRows] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [accountId, setAccountId] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState("");

  const headers = allRows.length > 0 ? allRows[0] : [];
  const dataRows = hasHeader ? allRows.slice(1) : allRows;
  const previewRows = dataRows.slice(0, 5);

  const hasAccountColumn = Object.values(columnMapping).includes("account");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) {
        setError("CSV file must have at least 2 rows");
        return;
      }
      setAllRows(rows);

      // Build flat name lists for content-based inference
      const categoryNames: string[] = [];
      for (const cat of categories.filter((c) => !c.parentId)) {
        categoryNames.push(cat.name);
        if (cat.children) {
          for (const child of cat.children) categoryNames.push(child.name);
        }
      }
      const accountNames = accounts.map((a) => a.name);

      const { mapping, dateFormat: inferredFormat } = inferColumnMapping(
        rows.slice(1).slice(0, 20),
        rows[0],
        categoryNames,
        accountNames,
      );
      setColumnMapping(mapping);
      setDateFormat(inferredFormat);
      setError("");
      setStep("map");
    };
    reader.readAsText(file);
  };

  const handleMapColumn = (colIndex: number, role: string) => {
    setColumnMapping((prev) => {
      const next = { ...prev };
      // Remove any existing mapping for this role (one role per column)
      for (const [key, val] of Object.entries(next)) {
        if (val === role && key !== String(colIndex)) {
          delete next[key];
        }
      }
      if (role) {
        next[String(colIndex)] = role;
      } else {
        delete next[String(colIndex)];
      }
      return next;
    });
  };

  const hasRequiredMapping = () => {
    const roles = Object.values(columnMapping);
    const hasDate = roles.includes("date");
    const hasDesc = roles.includes("description");
    const hasAmount = roles.includes("amount") || roles.includes("debit") || roles.includes("credit");
    const hasAccount = roles.includes("account") || !!accountId;
    return hasDate && hasDesc && hasAmount && hasAccount;
  };

  const handleImport = async () => {
    if (!hasAccountColumn && !accountId) {
      setError("Please select a target account or map an Account column");
      return;
    }

    setImporting(true);
    setError("");

    // Build column mapping object for the API
    const mapping: Record<string, number> = {};
    for (const [colIdx, role] of Object.entries(columnMapping)) {
      mapping[role] = parseInt(colIdx, 10);
    }

    try {
      const res = await fetch("/api/transaction/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: hasAccountColumn ? undefined : accountId,
          columnMapping: mapping,
          dateFormat,
          rows: dataRows,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Import failed");
        return;
      }

      const data = await res.json();
      setResult(data);
      setStep("done");
    } catch {
      setError("Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setStep("upload");
    setAllRows([]);
    setColumnMapping({});
    setAccountId("");
    setResult(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
    onClose();
    if (result) onComplete();
  };

  const inputClass =
    "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50";

  return (
    <Modal open={open} onClose={handleClose} title="Import CSV" className="w-full max-w-2xl">
      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="flex flex-col items-center gap-4 py-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Upload a CSV file exported from your bank.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="text-sm text-zinc-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800 dark:text-zinc-400 dark:file:bg-zinc-50 dark:file:text-zinc-900"
          />
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
      )}

      {/* Step 2: Map columns */}
      {step === "map" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={hasHeader}
                onChange={(e) => setHasHeader(e.target.checked)}
                className="accent-zinc-900 dark:accent-zinc-50"
              />
              First row is a header
            </label>
          </div>

          <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                  {headers.map((_, i) => (
                    <th key={i} className="px-3 py-2">
                      <select
                        value={columnMapping[String(i)] || ""}
                        onChange={(e) => handleMapColumn(i, e.target.value)}
                        className="w-full rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                      >
                        {COLUMN_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </th>
                  ))}
                </tr>
                {hasHeader && (
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                    {headers.map((h, i) => (
                      <th key={i} className="px-3 py-1.5 text-left text-xs font-medium text-zinc-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {previewRows.map((row, ri) => (
                  <tr key={ri} className="border-b border-zinc-100 dark:border-zinc-800">
                    {row.map((cell, ci) => (
                      <td key={ci} className="max-w-[200px] truncate px-3 py-1.5 text-zinc-700 dark:text-zinc-300">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Date Format</label>
              <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className={inputClass}>
                {DATE_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            {!hasAccountColumn && (
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Target Account</label>
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
                  <option value="">Select account...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {hasAccountColumn && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Account will be matched by name from the CSV. Rows with unrecognized account names will be skipped.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {dataRows.length} transaction{dataRows.length !== 1 ? "s" : ""} found
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => { setStep("upload"); setAllRows([]); setColumnMapping({}); }}
                className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !hasRequiredMapping()}
                className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {importing ? "Importing..." : `Import ${dataRows.length} Transactions`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === "done" && result && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <strong>{result.imported}</strong> transaction{result.imported !== 1 ? "s" : ""} imported.
            {result.skipped > 0 && (
              <> <strong>{result.skipped}</strong> row{result.skipped !== 1 ? "s" : ""} skipped.</>
            )}
          </p>
          <button
            onClick={handleClose}
            className="cursor-pointer rounded-md bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}
