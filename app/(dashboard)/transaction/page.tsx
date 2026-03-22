"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import { PencilSquareIcon, EyeIcon, EyeSlashIcon, PlusIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
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

const PAGE_SIZE = 10;

export default function TransactionPage() {
  const i18n = useTranslations("transaction");
  const i18nc = useTranslations("common");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
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
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const loadingMoreRef = useRef(false);

  const ACCOUNT_COLORS = [
    "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
    "#ef4444", "#14b8a6", "#f97316", "#6366f1",
    "#ec4899", "#06b6d4",
  ];

  const accountColorMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a, i) => {
      map.set(a.id, ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]);
    });
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  const fetchTransactions = useCallback(async (f: FilterValues, p: number, append: boolean) => {
    const params = new URLSearchParams();
    params.set("includeHidden", "true");
    params.set("page", String(p));
    params.set("pageSize", String(PAGE_SIZE));
    params.set("sortBy", "date");
    params.set("sortOrder", "desc");
    if (f.search) params.set("search", f.search);
    if (f.accountId) params.set("accountId", f.accountId);
    if (f.categoryId) params.set("categoryId", f.categoryId);
    if (f.startDate) params.set("startDate", f.startDate);
    if (f.endDate) params.set("endDate", f.endDate);
    if (f.minAmount) params.set("minAmount", f.minAmount);
    if (f.maxAmount) params.set("maxAmount", f.maxAmount);

    const res = await fetch(`/api/transaction?${params.toString()}`);
    const data = await res.json();
    if (append) {
      setTransactions((prev) => [...prev, ...data.transactions]);
    } else {
      setTransactions(data.transactions);
    }
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
    })).sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)));
    setTags(Array.isArray(tagData) ? tagData.map((t: Tag & { transactionCount?: number; totalAmount?: number }) => ({ id: t.id, name: t.name, color: t.color })) : []);
  }, []);

  useEffect(() => {
    Promise.all([fetchTransactions(filters, 1, false), fetchMeta()]).then(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMoreRef.current) return;
      const scrollBottom = window.innerHeight + window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      if (scrollBottom >= docHeight - 300) {
        const loaded = transactions.length;
        if (loaded < total) {
          loadingMoreRef.current = true;
          setLoadingMore(true);
          const nextPage = Math.floor(loaded / PAGE_SIZE) + 1;
          setPage(nextPage);
          fetchTransactions(filters, nextPage, true).then(() => {
            setLoadingMore(false);
            loadingMoreRef.current = false;
          });
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [transactions.length, total, filters, fetchTransactions]);

  const handleFilter = (newFilters: FilterValues) => {
    setFilters(newFilters);
    setPage(1);
    fetchTransactions(newFilters, 1, false);
  };

  const handleUpdateCategory = async (transactionId: string, categoryId: string | null) => {
    await fetch(`/api/transaction/${transactionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });
    // Reload all currently loaded transactions
    await reloadAll();
  };

  const handleToggleHidden = async (transactionId: string, isHidden: boolean) => {
    await fetch(`/api/transaction/${transactionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden }),
    });
    await reloadAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`/api/transaction/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    setDeleting(false);
    await reloadAll();
  };

  const reloadAll = async () => {
    // Reload all pages up to the current loaded count
    const pagesToLoad = Math.ceil(transactions.length / PAGE_SIZE) || 1;
    const params = new URLSearchParams();
    params.set("includeHidden", "true");
    params.set("page", "1");
    params.set("pageSize", String(pagesToLoad * PAGE_SIZE));
    params.set("sortBy", "date");
    params.set("sortOrder", "desc");
    if (filters.search) params.set("search", filters.search);
    if (filters.accountId) params.set("accountId", filters.accountId);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    if (filters.minAmount) params.set("minAmount", filters.minAmount);
    if (filters.maxAmount) params.set("maxAmount", filters.maxAmount);

    const res = await fetch(`/api/transaction?${params.toString()}`);
    const data = await res.json();
    setTransactions(data.transactions);
    setTotal(data.total);
  };

  const handleTransactionAdded = () => {
    reloadAll();
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
      render: (t: Transaction) => formatDate(t.date),
      className: "w-28",
    },
    {
      key: "description",
      header: i18n("description"),
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{i18n("title")}</h1>
        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={handleDownloadCsv}
            disabled={transactions.length === 0}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-card-border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-accent-subtle hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed dark:text-zinc-300"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {i18n("downloadCsv")}
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-card-border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-accent-subtle hover:text-accent dark:text-zinc-300"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            {i18n("importCsv")}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex cursor-pointer items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            <PlusIcon className="h-4 w-4" />
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
      <div className="hidden rounded-lg border border-card-border bg-card-bg md:block">
        <DataTable
          columns={columns}
          data={transactions}
          keyExtractor={(t) => t.id}
          emptyMessage={i18n("noTransactions")}
          onRowClick={(t) => setEditTransaction(t)}
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
              className="card-hover cursor-pointer rounded-lg border border-card-border bg-card-bg p-4"
            >
              {/* Row 1: color square + date + description + tags + amount */}
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: accountColorMap.get(t.account.id) || "#94a3b8" }}
                  title={t.account.institution ? `${t.account.institution.name} ${t.account.name}` : t.account.name}
                />
                <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <span className={`min-w-0 flex-1 truncate text-sm font-medium ${t.isHidden ? "line-through text-zinc-400 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}>
                  {t.description}
                </span>
                {t.transactionTags && t.transactionTags.length > 0 && (
                  <span className="flex items-center gap-1 shrink-0">
                    {t.transactionTags.map((tt) => (
                      <span
                        key={tt.tag.id}
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: tt.tag.color }}
                        title={tt.tag.name}
                      />
                    ))}
                  </span>
                )}
                <span className="shrink-0">
                  <CurrencyDisplay amount={t.amount} />
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="flex items-center justify-center gap-2 py-6">
          <LoadingSpinner />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{i18nc("loading")}</span>
        </div>
      )}

      {/* End of list indicator */}
      {!loadingMore && transactions.length > 0 && transactions.length >= total && (
        <div className="flex items-center gap-3 py-6">
          <div className="h-px flex-1 bg-card-border" />
          <span className="shrink-0 text-sm text-zinc-400 dark:text-zinc-500">
            {i18nc("showingRange", { start: 1, end: transactions.length, total })}
          </span>
          <div className="h-px flex-1 bg-card-border" />
        </div>
      )}

      {/* FAB — mobile only */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 md:hidden">
        {fabOpen && (
          <>
            <div className="fixed inset-0 -z-10" onClick={() => setFabOpen(false)} />
            <button
              onClick={() => { setShowAdd(true); setFabOpen(false); }}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-emerald-600"
            >
              <PlusIcon className="h-5 w-5" />
              {i18n("addTransaction")}
            </button>
            <button
              onClick={() => { setShowImport(true); setFabOpen(false); }}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-medium text-accent-text shadow-lg hover:bg-accent-hover"
            >
              <ArrowUpTrayIcon className="h-5 w-5" />
              {i18n("importCsv")}
            </button>
            <button
              onClick={() => { handleDownloadCsv(); setFabOpen(false); }}
              disabled={transactions.length === 0}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-card-bg border border-card-border px-4 py-3 text-sm font-medium text-zinc-700 shadow-lg hover:bg-accent-subtle hover:text-accent disabled:opacity-50 dark:text-zinc-300"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              {i18n("downloadCsv")}
            </button>
          </>
        )}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className="cursor-pointer flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-text shadow-lg hover:bg-accent-hover"
          style={{ transition: "transform 0.3s ease", transform: fabOpen ? "rotate(135deg)" : "rotate(0deg)" }}
        >
          <PlusIcon className="h-7 w-7" />
        </button>
      </div>

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
        allTags={tags}
        onTagsChanged={fetchMeta}
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
