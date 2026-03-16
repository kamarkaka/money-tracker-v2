"use client";

import { useState } from "react";
import { CurrencyDisplay } from "@/app/components/ui/CurrencyDisplay";
import { formatCurrency } from "@/app/lib/utils";
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
            ({transactions.length} transaction{transactions.length !== 1 ? "s" : ""})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CurrencyDisplay amount={total} />
          {budgetAmount > 0 && (
            <span className="text-sm text-zinc-400 dark:text-zinc-500">
              / {formatCurrency(budgetAmount)}
            </span>
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
