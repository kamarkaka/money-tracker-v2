"use client";

import { useState, useEffect, useCallback } from "react";
import { TransactionFilters, FilterValues } from "@/app/components/transaction/TransactionFilters";
import { TransactionCategoryEditor } from "@/app/components/transaction/TransactionCategoryEditor";
import { AddTransactionModal } from "@/app/components/transaction/AddTransactionModal";
import { EditTransactionModal } from "@/app/components/transaction/EditTransactionModal";
import { ImportCsvModal } from "@/app/components/transaction/ImportCsvModal";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { DataTable } from "@/app/components/ui/DataTable";
import { CurrencyDisplay } from "@/app/components/ui/CurrencyDisplay";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";
import { formatDate } from "@/app/lib/utils";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

interface Transaction {
  id: string;
  description: string;
  amount: string | number;
  date: string;
  categoryId: string | null;
  isHidden: boolean;
  isManual: boolean;
  account: { id: string; name: string };
  category: { id: string; name: string; parent?: { id: string; name: string } | null } | null;
}

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

interface Account {
  id: string;
  name: string;
}

export default function TransactionPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterValues>({
    search: "",
    accountId: "",
    categoryId: "",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
  });
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const pageSize = 50;
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkApplying, setBulkApplying] = useState(false);

  const fetchTransactions = useCallback(async (f: FilterValues, p: number, sk?: string, so?: "asc" | "desc") => {
    const params = new URLSearchParams();
    params.set("includeHidden", "true");
    params.set("page", String(p));
    params.set("pageSize", String(pageSize));
    if (sk) params.set("sortBy", sk);
    if (so) params.set("sortOrder", so);
    if (f.search) params.set("search", f.search);
    if (f.accountId) params.set("accountId", f.accountId);
    if (f.categoryId) params.set("categoryId", f.categoryId);
    if (f.startDate) params.set("startDate", f.startDate);
    if (f.endDate) params.set("endDate", f.endDate);
    if (f.minAmount) params.set("minAmount", f.minAmount);
    if (f.maxAmount) params.set("maxAmount", f.maxAmount);

    const res = await fetch(`/api/transaction?${params.toString()}`);
    const data = await res.json();
    setTransactions(data.transactions);
    setTotal(data.total);
  }, []);

  const fetchMeta = useCallback(async () => {
    const [catRes, accRes] = await Promise.all([
      fetch("/api/category"),
      fetch("/api/account"),
    ]);
    const [catData, accData] = await Promise.all([catRes.json(), accRes.json()]);
    setCategories(catData);
    setAccounts(accData.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })));
  }, []);

  useEffect(() => {
    Promise.all([fetchTransactions(filters, page, sortKey, sortOrder), fetchMeta()]).then(() => setLoading(false));
  // Only run on mount — filter/page/sort changes are handled by their own callbacks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = (newFilters: FilterValues) => {
    setFilters(newFilters);
    setPage(1);
    setSelectedIds(new Set());
    fetchTransactions(newFilters, 1, sortKey, sortOrder);
  };

  const handleSort = (key: string) => {
    const newOrder = sortKey === key && sortOrder === "desc" ? "asc" : "desc";
    setSortKey(key);
    setSortOrder(newOrder);
    setPage(1);
    setSelectedIds(new Set());
    fetchTransactions(filters, 1, key, newOrder);
  };

  const handleUpdateCategory = async (transactionId: string, categoryId: string | null) => {
    await fetch(`/api/transaction/${transactionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });
    await fetchTransactions(filters, page, sortKey, sortOrder);
  };

  const handleToggleHidden = async (transactionId: string, isHidden: boolean) => {
    await fetch(`/api/transaction/${transactionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden }),
    });
    await fetchTransactions(filters, page, sortKey, sortOrder);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`/api/transaction/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    setDeleting(false);
    await fetchTransactions(filters, page, sortKey, sortOrder);
  };

  const handleTransactionAdded = () => {
    fetchTransactions(filters, page, sortKey, sortOrder);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const handleBulkCategorize = async () => {
    if (!bulkCategoryId && bulkCategoryId !== "uncategorize") return;
    setBulkApplying(true);
    const catId = bulkCategoryId === "uncategorize" ? null : bulkCategoryId;
    await Promise.all(
      [...selectedIds].map((id) =>
        fetch(`/api/transaction/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId: catId }),
        })
      )
    );
    setSelectedIds(new Set());
    setBulkCategoryId("");
    setBulkApplying(false);
    await fetchTransactions(filters, page, sortKey, sortOrder);
  };

  const handleDownloadCsv = async () => {
    const params = new URLSearchParams();
    params.set("includeHidden", "true");
    params.set("pageSize", "0");
    if (filters.search) params.set("search", filters.search);
    if (filters.accountId) params.set("accountId", filters.accountId);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    if (filters.minAmount) params.set("minAmount", filters.minAmount);
    if (filters.maxAmount) params.set("maxAmount", filters.maxAmount);

    const res = await fetch(`/api/transaction?${params.toString()}`);
    const data = await res.json();
    const rows: Transaction[] = data.transactions;

    const csvEscape = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const categoryLabel = (t: Transaction) => {
      if (!t.category) return "";
      if (t.category.parent) return `${t.category.parent.name} > ${t.category.name}`;
      return t.category.name;
    };

    const header = "Date,Description,Account,Category,Amount";
    const lines = rows.map((t) =>
      [
        t.date.split("T")[0],
        csvEscape(t.description),
        csvEscape(t.account.name),
        csvEscape(categoryLabel(t)),
        Number(t.amount).toFixed(2),
      ].join(",")
    );

    const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  // Build flat category options for bulk categorize
  const bulkCategoryOptions: { id: string; label: string }[] = [];
  for (const parent of categories.filter((c) => !c.parentId)) {
    bulkCategoryOptions.push({ id: parent.id, label: parent.name });
    if (parent.children) {
      for (const child of parent.children) {
        bulkCategoryOptions.push({ id: child.id, label: `${parent.name} > ${child.name}` });
      }
    }
  }

  const columns = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={transactions.length > 0 && selectedIds.size === transactions.length}
          onChange={toggleSelectAll}
          className="accent-zinc-900 dark:accent-zinc-50"
        />
      ),
      render: (t: Transaction) => (
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedIds.has(t.id)}
            onChange={() => toggleSelect(t.id)}
            className="accent-zinc-900 dark:accent-zinc-50"
          />
        </div>
      ),
      className: "w-10",
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (t: Transaction) => formatDate(t.date),
      className: "w-28",
    },
    {
      key: "description",
      header: "Description",
      sortable: true,
      render: (t: Transaction) => (
        <div className="group/desc flex items-center gap-2">
          <span className={t.isHidden ? "line-through text-zinc-400 dark:text-zinc-500" : ""}>
            {t.description}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleHidden(t.id, !t.isHidden); }}
            className="cursor-pointer rounded px-2 py-1 text-xs text-zinc-400 opacity-0 transition-opacity group-hover/desc:opacity-100 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            {t.isHidden ? "Unhide" : "Hide"}
          </button>
          {t.isManual && (
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteId(t.id); }}
              className="cursor-pointer rounded px-2 py-1 text-xs text-red-400 opacity-0 transition-opacity group-hover/desc:opacity-100 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
          )}
        </div>
      ),
    },
    {
      key: "account",
      header: "Account",
      sortable: true,
      render: (t: Transaction) => t.account.name,
      className: "w-36",
    },
    {
      key: "category",
      header: "Category",
      render: (t: Transaction) => (
        <div onClick={(e) => e.stopPropagation()}>
          <TransactionCategoryEditor
            transactionId={t.id}
            currentCategoryId={t.categoryId}
            categories={categories}
            onUpdate={handleUpdateCategory}
          />
        </div>
      ),
      className: "w-48",
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      render: (t: Transaction) => <CurrencyDisplay amount={t.amount} />,
      className: "w-28 text-right",
    },
    {
      key: "actions",
      header: "",
      render: (t: Transaction) => (
        <button
          onClick={(e) => { e.stopPropagation(); setEditTransaction(t); }}
          className="cursor-pointer rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          title="Edit transaction"
        >
          <PencilSquareIcon className="h-4 w-4" />
        </button>
      ),
      className: "w-16 text-right",
    },
  ];

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Transactions</h1>
        <div className="flex gap-3">
          <button
            onClick={handleDownloadCsv}
            disabled={transactions.length === 0}
            className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Download CSV
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Import CSV
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Add Transaction
          </button>
        </div>
      </div>

      <div className="mb-6">
        <TransactionFilters
          accounts={accounts}
          categories={categories}
          onFilter={handleFilter}
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 mb-4 flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {selectedIds.size} selected
          </span>
          <select
            value={bulkCategoryId}
            onChange={(e) => setBulkCategoryId(e.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
          >
            <option value="">Assign category...</option>
            <option value="uncategorize">Remove category</option>
            {bulkCategoryOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <button
            onClick={handleBulkCategorize}
            disabled={bulkApplying || !bulkCategoryId}
            className="cursor-pointer rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {bulkApplying ? "Applying..." : "Apply"}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Clear
          </button>
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <DataTable
          columns={columns}
          data={transactions}
          keyExtractor={(t) => t.id}
          emptyMessage="No transactions found."
          onRowClick={(t) => toggleSelect(t.id)}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchTransactions(filters, p, sortKey, sortOrder); }}
              disabled={page === 1}
              className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Previous
            </button>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); fetchTransactions(filters, p, sortKey, sortOrder); }}
              disabled={page === totalPages}
              className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <EditTransactionModal
        open={!!editTransaction}
        onClose={() => setEditTransaction(null)}
        onComplete={handleTransactionAdded}
        onPrev={() => {
          if (!editTransaction) return;
          const idx = transactions.findIndex((t) => t.id === editTransaction.id);
          if (idx > 0) setEditTransaction(transactions[idx - 1]);
        }}
        onNext={() => {
          if (!editTransaction) return;
          const idx = transactions.findIndex((t) => t.id === editTransaction.id);
          if (idx < transactions.length - 1) setEditTransaction(transactions[idx + 1]);
        }}
        hasPrev={!!editTransaction && transactions.findIndex((t) => t.id === editTransaction.id) > 0}
        hasNext={!!editTransaction && transactions.findIndex((t) => t.id === editTransaction.id) < transactions.length - 1}
        transaction={editTransaction}
        accounts={accounts}
        categories={categories}
      />

      <AddTransactionModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onComplete={handleTransactionAdded}
        accounts={accounts}
        categories={categories}
      />

      <ImportCsvModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onComplete={handleTransactionAdded}
        accounts={accounts}
        categories={categories}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
