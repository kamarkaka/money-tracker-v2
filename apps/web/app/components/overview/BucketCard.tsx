"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/app/lib/utils";
import { BucketTransactionList } from "./BucketTransactionList";
import { getBudgetIcon, getBudgetIconColor } from "@/app/components/budget/BudgetIconPicker";

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
  icon?: string | null;
  colorIndex?: number;
  budgetAmount?: number;
  transactions: Transaction[];
  categories: Category[];
  onUpdateCategory: (transactionId: string, categoryId: string | null) => Promise<void>;
}

export function BucketCard({
  name,
  icon,
  colorIndex = 0,
  budgetAmount = 0,
  transactions,
  categories,
  onUpdateCategory,
}: BucketCardProps) {
  const [expanded, setExpanded] = useState(false);
  const i18n = useTranslations("overview");
  const total = transactions.reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);
  const color = getBudgetIconColor(colorIndex);
  const BudgetIcon = getBudgetIcon(icon);

  return (
    <div className="card-hover rounded-lg border border-card-border bg-card-bg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="cursor-pointer flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        {/* Chevron — desktop only */}
        <svg
          className={`hidden h-4 w-4 shrink-0 text-zinc-400 transition-transform md:block ${expanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {/* Icon — spans both rows */}
        {BudgetIcon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full ${color.bg}`}>
            <BudgetIcon className={`h-5 w-5 ${color.text}`} />
          </div>
        )}
        {/* Right content: two rows */}
        <div className="min-w-0 flex-1">
          {/* Row 1: name + amount */}
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 flex-1 truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">{name}</span>
            <span className={`shrink-0 text-base font-semibold ${total >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {formatCurrency(Math.round(Math.abs(total)), "USD", true)}
            </span>
          </div>
          {/* Row 2: progress bar + amount left */}
          {budgetAmount > 0 && (
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <div className="h-1 w-2/3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="animate-progress h-full rounded-full bg-accent"
                  style={{ width: `${Math.min((Math.abs(total) / budgetAmount) * 100, 100)}%` }}
                />
              </div>
              <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                {Math.abs(total) > budgetAmount
                  ? i18n("over", { amount: formatCurrency(Math.round(Math.abs(total) - budgetAmount), "USD", true) })
                  : i18n("left", { amount: formatCurrency(Math.round(budgetAmount - Math.abs(total)), "USD", true) })}
              </span>
            </div>
          )}
        </div>
      </button>
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
