"use client";

import { useState, useRef } from "react";
import { Modal } from "@/app/components/ui/Modal";

interface Account {
  id: string;
  name: string;
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

function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  headers.forEach((h, i) => {
    const lower = h.toLowerCase().trim();
    if (lower.includes("date")) mapping[String(i)] = "date";
    else if (lower.includes("description") || lower.includes("memo") || lower.includes("payee"))
      mapping[String(i)] = "description";
    else if (lower === "amount") mapping[String(i)] = "amount";
    else if (lower.includes("debit") || lower.includes("withdrawal")) mapping[String(i)] = "debit";
    else if (lower.includes("credit") || lower.includes("deposit")) mapping[String(i)] = "credit";
    else if (lower.includes("category")) mapping[String(i)] = "category";
    else if (lower.includes("account")) mapping[String(i)] = "account";
  });
  return mapping;
}

interface ImportCsvModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  accounts: Account[];
}

export function ImportCsvModal({ open, onClose, onComplete, accounts }: ImportCsvModalProps) {
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
      setColumnMapping(autoDetectMapping(rows[0]));
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
