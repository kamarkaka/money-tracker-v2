"use client";

import { CurrencyDisplay } from "@/app/components/ui/CurrencyDisplay";
import { formatDate } from "@/app/lib/utils";
import { TransactionCategoryEditor } from "@/app/components/transaction/TransactionCategoryEditor";

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

interface BucketTransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onUpdateCategory: (transactionId: string, categoryId: string | null) => Promise<void>;
}

export function BucketTransactionList({
  transactions,
  categories,
  onUpdateCategory,
}: BucketTransactionListProps) {
  if (transactions.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
        No transactions in this bucket.
      </p>
    );
  }

  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {transactions.map((t) => (
        <div key={t.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
          <span className="w-20 shrink-0 text-zinc-500 dark:text-zinc-400">{formatDate(t.date)}</span>
          <span className="min-w-0 flex-1 truncate text-zinc-500 dark:text-zinc-400">{t.description}</span>
          <span className="w-28 shrink-0 truncate text-xs text-zinc-400 dark:text-zinc-500">{t.account.name}</span>
          <div className="w-40 shrink-0">
            <TransactionCategoryEditor
              transactionId={t.id}
              currentCategoryId={t.categoryId}
              categories={categories}
              onUpdate={onUpdateCategory}
            />
          </div>
          <span className="w-24 shrink-0 text-right">
            <CurrencyDisplay amount={t.amount} />
          </span>
        </div>
      ))}
    </div>
  );
}
