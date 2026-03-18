"use client";

import { useState } from "react";
import { formatCurrency } from "@/app/lib/utils";
import { useTranslations } from "next-intl";
import { BucketTransactionList } from "./BucketTransactionList";

interface Transaction {
  id: string;
  description: string;
  amount: string | number;
  date: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  account: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

interface BucketCardProps {
  name: string;
  total: number;
  budgetAmount: number;
  transactions: Transaction[];
  categories: Category[];
  onUpdateCategory: (transactionId: string, categoryId: string | null) => Promise<void>;
}

export function BucketCard({
  name,
  total,
  budgetAmount,
  transactions,
  categories,
  onUpdateCategory,
}: BucketCardProps) {
  const [expanded, setExpanded] = useState(false);
  const i18n = useTranslations("overview");

  const isIncome = total > 0;
  const spent = Math.abs(total);
  const pct = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0;
  const isOver = budgetAmount > 0 && spent > budgetAmount;

  // Expense: green at ≤50%, gradient to red at 100%
  // Income: red at ≤50%, gradient to green at 100%
  const ratio = budgetAmount > 0 ? Math.min(spent / budgetAmount, 1) : 0;
  const t = ratio <= 0.5 ? 0 : (ratio - 0.5) / 0.5;
  let barColor: string;
  if (isIncome) {
    const r = Math.round(239 - t * (205));   // red(239) → green(34)
    const g = Math.round(68 + t * (129));    // red(68)  → green(197)
    const b = Math.round(68 + t * (26));     // red(68)  → green(94)
    barColor = spent > budgetAmount ? "rgb(34, 197, 94)" : `rgb(${r}, ${g}, ${b})`;
  } else {
    const r = Math.round(34 + t * (205));    // green(34)  → red(239)
    const g = Math.round(197 - t * (129));   // green(197) → red(68)
    const b = Math.round(94 - t * (26));     // green(94)  → red(68)
    barColor = spent > budgetAmount ? "rgb(239, 68, 68)" : `rgb(${r}, ${g}, ${b})`;
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <button
        onClick={() => setExpanded(!expanded)}
        className="cursor-pointer flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`h-4 w-4 text-zinc-400 transition-transform ${expanded ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{name}</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            ({i18n("transactions", { count: transactions.length })})
          </span>
        </div>
      </button>
      {budgetAmount > 0 && (
        <div className="px-5 pb-3">
          <div className="relative h-8 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: barColor }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-3 text-sm font-semibold">
              <span className={pct > 15 ? "text-white" : "text-zinc-600 dark:text-zinc-300"}>
                {isIncome ? i18n("earned", { amount: formatCurrency(spent) }) : i18n("spent", { amount: formatCurrency(spent) })}
              </span>
              <span className={pct > 85 ? "text-white" : "text-zinc-500 dark:text-zinc-400"}>
                {isOver ? i18n("over", { amount: formatCurrency(spent - budgetAmount) }) : i18n("left", { amount: formatCurrency(budgetAmount - spent) })}
              </span>
            </div>
          </div>
        </div>
      )}
      {expanded && (
        <div className="border-t border-zinc-200 dark:border-zinc-700">
          <BucketTransactionList
            transactions={transactions}
            categories={categories}
            onUpdateCategory={onUpdateCategory}
          />
        </div>
      )}
    </div>
  );
}
