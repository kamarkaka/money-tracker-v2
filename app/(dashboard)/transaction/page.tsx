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
import { PencilSquareIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { TagBadge } from "@/app/components/tag/TagBadge";
import { useTranslations } from "next-intl";

interface Transaction {
  id: string;
  description: string;
  amount: string | number;
  date: string;
  categoryId: string | null;
  isHidden: boolean;
  isManual: boolean;
  account: { id: string; name: string; institution?: { name: string } };
  category: { id: string; name: string; parent?: { id: string; name: string } | null } | null;
  transactionTags?: { tag: { id: string; name: string; color: string } }[];
}

interface Tag {
  id: string;
  name: string;
  color: string;
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
  isHidden?: boolean;
}

export default function TransactionPage() {
  const i18n = useTranslations("transaction");
  const i18nc = useTranslations("common");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
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
    const [catRes, accRes, tagRes] = await Promise.all([
      fetch("/api/category"),
      fetch("/api/account"),
      fetch("/api/tags"),
    ]);
    const [catData, accData, tagData] = await Promise.all([catRes.json(), accRes.json(), tagRes.json()]);
    setCategories(catData);
    setAccounts(accData.map((a: { id: string; name: string; isHidden?: boolean; institution?: { name: string } }) => ({
      id: a.id,
      name: a.institution ? `${a.institution.name} - ${a.name}` : a.name,
      isHidden: a.isHidden,
    })));
    setTags(Array.isArray(tagData) ? tagData.map((t: Tag & { transactionCount?: number; totalAmount?: number }) => ({ id: t.id, name: t.name, color: t.color })) : []);
  }, []);

  useEffect(() => {
    Promise.all([fetchTransactions(filters, page, sortKey, sortOrder), fetchMeta()]).then(() => setLoading(false));
  // Only run on mount — filter/page/sort changes are handled by their own callbacks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = (newFilters: FilterValues) => {
    setFilters(newFilters);
    setPage(1);
    fetchTransactions(newFilters, 1, sortKey, sortOrder);
  };

  const handleSort = (key: string) => {
    let newKey: string;
    let newOrder: "asc" | "desc";

    if (sortKey !== key) {
      // First click on a new column: asc
      newKey = key;
      newOrder = "asc";
    } else if (sortOrder === "asc") {
      // Second click: desc
      newKey = key;
      newOrder = "desc";
    } else {
      // Third click: restore default (date desc)
      newKey = "date";
      newOrder = "desc";
    }

    setSortKey(newKey);
    setSortOrder(newOrder);
    setPage(1);
    fetchTransactions(filters, 1, newKey, newOrder);
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
        csvEscape(t.account.institution ? `${t.account.institution.name} ${t.account.name}` : t.account.name),
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

  const columns = [
    {
      key: "date",
      header: i18n("date"),
      sortable: true,
      render: (t: Transaction) => formatDate(t.date),
      className: "w-28",
    },
    {
      key: "description",
      header: i18n("description"),
      sortable: true,
      render: (t: Transaction) => (
        <div className="flex items-center gap-2">
          <span className={t.isHidden ? "line-through text-zinc-400 dark:text-zinc-500" : ""}>
            {t.description}
          </span>
          {t.transactionTags && t.transactionTags.length > 0 && (
            <span className="flex items-center gap-1">
              {t.transactionTags.map((tt) => (
                <TagBadge key={tt.tag.id} name={tt.tag.name} color={tt.tag.color} />
              ))}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "account",
      header: i18n("account"),
      sortable: true,
      render: (t: Transaction) => t.account.institution ? `${t.account.institution.name} ${t.account.name}` : t.account.name,
      className: "w-36",
    },
    {
      key: "category",
      header: i18n("categoryOptional"),
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
      header: i18n("amount"),
      sortable: true,
      render: (t: Transaction) => <CurrencyDisplay amount={t.amount} />,
      className: "w-28 text-right",
    },
    {
      key: "actions",
      header: "",
      render: (t: Transaction) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleToggleHidden(t.id, !t.isHidden)}
            className="cursor-pointer rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            title={t.isHidden ? i18n("unhide") : i18n("hide")}
          >
            {t.isHidden ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setEditTransaction(t)}
            className="cursor-pointer rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            title={i18n("editTransaction")}
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
        </div>
      ),
      className: "w-20 text-right",
    },
  ];

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{i18n("title")}</h1>
        <div className="grid w-full grid-cols-3 gap-2 md:flex md:w-auto md:gap-3">
          <button
            onClick={handleDownloadCsv}
            disabled={transactions.length === 0}
            className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {i18n("downloadCsv")}
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
{i18n("importCsv")}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {i18n("addTransaction")}
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


      {/* Desktop table */}
      <div className="hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:block">
        <DataTable
          columns={columns}
          data={transactions}
          keyExtractor={(t) => t.id}
          emptyMessage={i18n("noTransactions")}
          onRowClick={(t) => setEditTransaction(t)}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
      </div>

      {/* Mobile card list */}
      <div className="flex flex-col gap-3 md:hidden">
        {transactions.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {i18n("noTransactions")}
          </div>
        ) : (
          transactions.map((t) => (
            <div
              key={t.id}
              onClick={() => setEditTransaction(t)}
              className="cursor-pointer rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              {/* Row 1: date, account, hide/edit buttons */}
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{formatDate(t.date)}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {t.account.institution ? `${t.account.institution.name} ${t.account.name}` : t.account.name}
                </span>
                <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleToggleHidden(t.id, !t.isHidden)}
                    className="cursor-pointer rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  >
                    {t.isHidden ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => setEditTransaction(t)}
                    className="cursor-pointer rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  >
                    <PencilSquareIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {/* Row 2: description, tags, amount */}
              <div className="mt-3 flex items-center gap-2">
                <span className={`min-w-0 flex-1 truncate text-sm font-medium ${t.isHidden ? "line-through text-zinc-400 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}>
                  {t.description}
                </span>
                {t.transactionTags && t.transactionTags.length > 0 && (
                  <span className="flex items-center gap-0.5 shrink-0">
                    {t.transactionTags.map((tt) => (
                      <TagBadge key={tt.tag.id} name={tt.tag.name} color={tt.tag.color} />
                    ))}
                  </span>
                )}
                <span className="shrink-0">
                  <CurrencyDisplay amount={t.amount} />
                </span>
              </div>
              {/* Row 3: category */}
              <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                <TransactionCategoryEditor
                  transactionId={t.id}
                  currentCategoryId={t.categoryId}
                  categories={categories}
                  onUpdate={handleUpdateCategory}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {i18nc("showingRange", { start: (page - 1) * pageSize + 1, end: Math.min(page * pageSize, total), total })}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchTransactions(filters, p, sortKey, sortOrder); }}
              disabled={page === 1}
              className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {i18nc("previous")}
            </button>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {i18nc("pageOf", { page, totalPages })}
            </span>
            <button
              onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); fetchTransactions(filters, p, sortKey, sortOrder); }}
              disabled={page === totalPages}
              className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {i18nc("next")}
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
        allTags={tags}
        onTagsChanged={fetchMeta}
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
        title={i18n("deleteTransaction")}
        message={i18n("deleteWarning")}
        confirmLabel={i18nc("delete")}
        loading={deleting}
      />
    </div>
  );
}
