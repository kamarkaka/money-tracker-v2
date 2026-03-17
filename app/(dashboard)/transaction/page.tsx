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
  const pageSize = 50;
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTransactions = useCallback(async (f: FilterValues, p: number) => {
    const params = new URLSearchParams();
    params.set("includeHidden", "true");
    params.set("page", String(p));
    params.set("pageSize", String(pageSize));
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
    Promise.all([fetchTransactions(filters, page), fetchMeta()]).then(() => setLoading(false));
  }, [fetchTransactions, fetchMeta, filters, page]);

  const handleFilter = (newFilters: FilterValues) => {
    setFilters(newFilters);
    setPage(1);
    fetchTransactions(newFilters, 1);
  };

  const handleUpdateCategory = async (transactionId: string, categoryId: string | null) => {
    await fetch(`/api/transaction/${transactionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });
    await fetchTransactions(filters, page);
  };

  const handleToggleHidden = async (transactionId: string, isHidden: boolean) => {
    await fetch(`/api/transaction/${transactionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden }),
    });
    await fetchTransactions(filters, page);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`/api/transaction/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    setDeleting(false);
    await fetchTransactions(filters, page);
  };

  const handleTransactionAdded = () => {
    fetchTransactions(filters, page);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const columns = [
    {
      key: "date",
      header: "Date",
      render: (t: Transaction) => formatDate(t.date),
      className: "w-28",
    },
    {
      key: "description",
      header: "Description",
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
      render: (t: Transaction) => <CurrencyDisplay amount={t.amount} />,
      className: "w-28 text-right",
    },
  ];

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Transactions</h1>
        <div className="flex gap-3">
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

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <DataTable
          columns={columns}
          data={transactions}
          keyExtractor={(t) => t.id}
          emptyMessage="No transactions found."
          onRowClick={(t) => setEditTransaction(t)}
        />
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Previous
            </button>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
