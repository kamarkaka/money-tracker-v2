"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon } from "@heroicons/react/24/outline";
import { MonthPicker } from "@/app/components/MonthPicker";
import { MonthlySummaryHeader } from "@/app/components/overview/MonthlySummaryHeader";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";
import { formatCurrency } from "@/app/lib/utils";
import { CasualAddModal } from "./CasualAddModal";

interface Transaction {
  id: string;
  description: string;
  amount: string | number;
  date: string;
  category: { id: string; name: string; emoji?: string | null } | null;
}

interface EmojiGroup {
  emoji: string;
  name: string;
  total: number;
  transactions: Transaction[];
}

export function CasualOverview() {
  const i18n = useTranslations("overview");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<{ id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmoji, setExpandedEmoji] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const startDate = new Date(year, month, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

    const [txRes, accRes] = await Promise.all([
      fetch(`/api/transaction?startDate=${startDate}&endDate=${endDate}&pageSize=0`),
      fetch("/api/account"),
    ]);

    if (txRes.ok) {
      const txData = await txRes.json();
      setTransactions(txData.transactions || []);
    }
    if (accRes.ok) {
      const accData = await accRes.json();
      setAccounts(accData);
    }
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group by emoji category
  const groups: EmojiGroup[] = [];
  const groupMap = new Map<string, EmojiGroup>();

  for (const t of transactions) {
    const emoji = t.category?.emoji || "📦";
    const name = t.category?.name || "Others";
    const key = emoji;
    if (!groupMap.has(key)) {
      groupMap.set(key, { emoji, name, total: 0, transactions: [] });
    }
    const g = groupMap.get(key)!;
    g.total += parseFloat(String(t.amount));
    g.transactions.push(t);
  }

  groups.push(...Array.from(groupMap.values()).sort((a, b) => Math.abs(b.total) - Math.abs(a.total)));

  const totalIncome = transactions
    .filter((t) => parseFloat(String(t.amount)) > 0)
    .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);

  const totalExpenses = transactions
    .filter((t) => parseFloat(String(t.amount)) < 0)
    .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);

  const netSavings = totalIncome + totalExpenses;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{i18n("title")}</h1>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </div>

      <div className="mb-4">
        <MonthlySummaryHeader totalIncome={totalIncome} totalExpenses={totalExpenses} />
      </div>

      {/* Spending grid */}
      {groups.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {i18n("noTransactions")}
        </div>
      ) : (
        <div className="flex flex-col gap-5" style={{ transition: "all 0.3s ease" }}>
          {Array.from({ length: Math.ceil(groups.length / 4) }).map((_, rowIdx) => {
            const rowGroups = groups.slice(rowIdx * 4, rowIdx * 4 + 4);
            const expandedInRow = rowGroups.find((g) => g.emoji === expandedEmoji);
            const expandedIndex = expandedInRow ? groups.indexOf(expandedInRow) : -1;

            const RING_COLORS = [
              "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
              "#f43f5e", "#14b8a6", "#f97316", "#6366f1",
              "#ec4899", "#06b6d4",
            ];
            const TEXT_COLORS = [
              "text-blue-500", "text-emerald-500", "text-violet-500", "text-amber-500",
              "text-rose-500", "text-teal-500", "text-orange-500", "text-indigo-500",
              "text-pink-500", "text-cyan-500",
            ];

            return (
              <div key={rowIdx}>
                <div className="grid grid-cols-4 gap-x-3 md:gap-x-4">
                  {rowGroups.map((group) => {
                    const index = groups.indexOf(group);
                    const absTotal = Math.abs(group.total);
                    const isIncome = group.total > 0;
                    const base = isIncome ? totalIncome : Math.abs(totalExpenses);
                    const pct = base > 0 ? Math.min((absTotal / base) * 100, 100) : 0;
                    const ringColor = RING_COLORS[index % RING_COLORS.length];
                    const textColor = TEXT_COLORS[index % TEXT_COLORS.length];
                    const radius = 32;
                    const circumference = 2 * Math.PI * radius;
                    const offset = circumference - (pct / 100) * circumference;
                    const isExpanded = expandedEmoji === group.emoji;

                    return (
                      <button
                        key={group.emoji}
                        onClick={() => setExpandedEmoji(isExpanded ? null : group.emoji)}
                        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl py-2 transition-colors ${isExpanded ? "bg-zinc-100 dark:bg-zinc-800" : ""}`}
                      >
                        <div className="relative flex h-[72px] w-[72px] items-center justify-center">
                          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 72 72">
                            <circle
                              cx="36" cy="36" r={radius}
                              fill="none" stroke="currentColor" strokeWidth="4"
                              className="text-zinc-200 dark:text-zinc-700"
                            />
                            <circle
                              cx="36" cy="36" r={radius}
                              fill="none" stroke={ringColor} strokeWidth="4"
                              strokeLinecap="round"
                              strokeDasharray={circumference}
                              strokeDashoffset={offset}
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <span className="text-3xl">{group.emoji}</span>
                        </div>
                        <span className={`text-sm font-bold ${textColor}`}>
                          {formatCurrency(Math.round(absTotal), "USD", true)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Expanded transaction list under this row */}
                {expandedInRow && (
                  <div className="animate-slide-down mt-2 rounded-lg border border-card-border bg-card-bg">
                    <div className="flex items-center gap-2 border-b border-card-border px-4 py-2">
                      <span className="text-lg">{expandedInRow.emoji}</span>
                      <span className={`text-sm font-semibold ${TEXT_COLORS[expandedIndex % TEXT_COLORS.length]}`}>
                        {formatCurrency(Math.round(Math.abs(expandedInRow.total)), "USD", true)}
                      </span>
                    </div>
                    {expandedInRow.transactions.map((t, i) => {
                      const textColor = TEXT_COLORS[expandedIndex % TEXT_COLORS.length];
                      return (
                        <div
                          key={t.id}
                          onClick={() => setEditTx(t)}
                          className={`flex cursor-pointer items-center gap-3 px-4 py-3 text-base hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${i < expandedInRow.transactions.length - 1 ? "border-b border-zinc-100 dark:border-zinc-800" : ""}`}
                        >
                          <span className={`w-14 shrink-0 text-sm ${textColor}`}>
                            {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                          <span className={`min-w-0 flex-1 truncate font-medium ${textColor}`}>
                            {t.description}
                          </span>
                          <span className={`shrink-0 font-semibold ${textColor}`}>
                            {formatCurrency(Math.abs(parseFloat(String(t.amount))))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quick-add FAB — always visible, toggles modal */}
      <button
        onClick={() => {
          if (editTx) {
            setEditTx(null);
          } else {
            setShowAdd(!showAdd);
          }
        }}
        className="fixed bottom-6 right-6 z-[60] flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600"
        style={{ transition: "transform 0.3s ease", transform: (showAdd || editTx) ? "rotate(135deg)" : "rotate(0deg)" }}
      >
        <PlusIcon className="h-7 w-7" />
      </button>

      {/* Add modal */}
      <CasualAddModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onComplete={() => fetchData()}
        accountId={accounts[0]?.id || ""}
        transactions={transactions}
      />

      {/* Edit modal */}
      <CasualAddModal
        open={!!editTx}
        onClose={() => setEditTx(null)}
        onComplete={() => fetchData()}
        accountId={accounts[0]?.id || ""}
        transactions={transactions}
        editTransaction={editTx}
      />
    </div>
  );
}
