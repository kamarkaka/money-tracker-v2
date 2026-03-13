"use client";

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

interface UncategorizedSectionProps {
  transactions: Transaction[];
  categories: Category[];
  onUpdateCategory: (transactionId: string, categoryId: string | null) => Promise<void>;
}

export function UncategorizedSection({
  transactions,
  categories,
  onUpdateCategory,
}: UncategorizedSectionProps) {
  if (transactions.length === 0) return null;

  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div className="px-5 py-4">
        <h3 className="text-base font-semibold text-zinc-500 dark:text-zinc-400">
          Uncategorized ({transactions.length})
        </h3>
      </div>
      <div className="border-t border-zinc-200 dark:border-zinc-700">
        <BucketTransactionList
          transactions={transactions}
          categories={categories}
          onUpdateCategory={onUpdateCategory}
        />
      </div>
    </div>
  );
}
