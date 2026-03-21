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

  // Green until 50%, then green -> yellow -> orange -> red from 50%-100%
  const ratio = budgetAmount > 0 ? Math.min(spent / budgetAmount, 1) : 0;

  function interpolateColor(t: number, colorStops: number[][]): string {
    // Stay green until 50%, then transition across stops from 50%-100%
    if (t <= 0.5) return `rgb(${colorStops[0][0]}, ${colorStops[0][1]}, ${colorStops[0][2]})`;
    if (t > 1) return  `rgb(${colorStops[colorStops.length - 1][0]}, ${colorStops[colorStops.length - 1][1]}, ${colorStops[colorStops.length - 1][2]})`;

    const adjusted = (t - 0.5) / 0.5; // remap 0.5-1.0 -> 0-1
    const segment = adjusted * (colorStops.length - 1);
    const si = Math.min(Math.floor(segment), colorStops.length - 2);
    const sf = segment - si;
    const cr = Math.round(colorStops[si][0] + sf * (colorStops[si + 1][0] - colorStops[si][0]));
    const cg = Math.round(colorStops[si][1] + sf * (colorStops[si + 1][1] - colorStops[si][1]));
    const cb = Math.round(colorStops[si][2] + sf * (colorStops[si + 1][2] - colorStops[si][2]));
    return `rgb(${cr}, ${cg}, ${cb})`;
  }

  let stops = [
    [34, 197, 94],  // green
    [220, 200, 40], // yellow
    [230, 126,34],  // orange
    [239, 68, 68],  // red
  ];
  if (isIncome) {
    stops = stops.reverse();
  }

  const barColor = interpolateColor(ratio, stops);

  return (
    <div className="card-hover rounded-lg border border-card-border bg-card-bg">
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
              className="animate-progress h-full rounded-full"
              style={{ width: `${pct}%`, backgroundColor: `${barColor}` }}
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
