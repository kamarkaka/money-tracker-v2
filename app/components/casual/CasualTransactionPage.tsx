"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon } from "@heroicons/react/24/outline";
import { CurrencyDisplay } from "@/app/components/ui/CurrencyDisplay";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";
import { CasualAddModal } from "./CasualAddModal";

interface Transaction {
  id: string;
  description: string;
  amount: string | number;
  date: string;
  category: { id: string; name: string; emoji?: string | null } | null;
}

const PAGE_SIZE = 20;

export function CasualTransactionPage() {
  const i18n = useTranslations("transaction");
  const i18nc = useTranslations("common");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<{ id: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const loadingMoreRef = useRef(false);

  const fetchTransactions = useCallback(async (page: number, append: boolean) => {
    const params = new URLSearchParams();
    params.set("includeHidden", "true");
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    params.set("sortBy", "date");
    params.set("sortOrder", "desc");

    const res = await fetch(`/api/transaction?${params.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    if (append) {
      setTransactions((prev) => [...prev, ...(data.transactions || [])]);
    } else {
      setTransactions(data.transactions || []);
    }
    setTotal(data.total || 0);
  }, []);

  const fetchMeta = useCallback(async () => {
    const res = await fetch("/api/account");
    const data = await res.json();
    setAccounts(data);
  }, []);

  useEffect(() => {
    Promise.all([fetchTransactions(1, false), fetchMeta()]).then(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMoreRef.current) return;
      const scrollBottom = window.innerHeight + window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      if (scrollBottom >= docHeight - 300) {
        if (transactions.length < total) {
          loadingMoreRef.current = true;
          setLoadingMore(true);
          const nextPage = Math.floor(transactions.length / PAGE_SIZE) + 1;
          fetchTransactions(nextPage, true).then(() => {
            setLoadingMore(false);
            loadingMoreRef.current = false;
          });
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [transactions.length, total, fetchTransactions]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  // Group transactions by date
  const grouped = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const dateKey = t.date.split("T")[0];
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(t);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{i18n("title")}</h1>
      </div>

      {transactions.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {i18n("noTransactions")}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Array.from(grouped.entries()).map(([dateKey, txs]) => (
            <div key={dateKey}>
              <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {new Date(dateKey + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </p>
              <div className="rounded-lg border border-card-border bg-card-bg">
                {txs.map((t, i) => (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 px-4 py-3 ${i < txs.length - 1 ? "border-b border-zinc-100 dark:border-zinc-800" : ""}`}
                  >
                    <span className="text-xl">{t.category?.emoji || "📦"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {t.description || t.category?.name || "Transaction"}
                      </p>
                    </div>
                    <span className="shrink-0">
                      <CurrencyDisplay amount={t.amount} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {loadingMore && (
        <div className="flex items-center justify-center gap-2 py-6">
          <LoadingSpinner />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{i18nc("loading")}</span>
        </div>
      )}

      {!loadingMore && transactions.length > 0 && transactions.length >= total && (
        <div className="flex items-center gap-3 py-6">
          <div className="h-px flex-1 bg-card-border" />
          <span className="shrink-0 text-sm text-zinc-400 dark:text-zinc-500">
            {i18nc("showingRange", { start: 1, end: transactions.length, total })}
          </span>
          <div className="h-px flex-1 bg-card-border" />
        </div>
      )}

      {/* Quick-add FAB — always visible, toggles modal */}
      <button
        onClick={() => setShowAdd(!showAdd)}
        className="fixed bottom-6 right-6 z-[60] flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600"
        style={{ transition: "transform 0.3s ease", transform: showAdd ? "rotate(135deg)" : "rotate(0deg)" }}
      >
        <PlusIcon className="h-7 w-7" />
      </button>

      <CasualAddModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onComplete={() => fetchTransactions(1, false)}
        accountId={accounts[0]?.id || ""}
        transactions={transactions}
      />
    </div>
  );
}
