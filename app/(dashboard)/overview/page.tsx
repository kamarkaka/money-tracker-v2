"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { MonthPicker } from "@/app/components/MonthPicker";
import { MonthlySummaryHeader } from "@/app/components/overview/MonthlySummaryHeader";
import { BucketCard } from "@/app/components/overview/BucketCard";
import { UncategorizedSection } from "@/app/components/overview/UncategorizedSection";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";
import { EmptyState } from "@/app/components/ui/EmptyState";

interface Transaction {
  id: string;
  description: string;
  amount: string | number;
  date: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  account: { id: string; name: string };
  transactionTags?: { tag: { id: string; name: string; color: string } }[];
}

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

interface BudgetBucket {
  id: string;
  name: string;
  amount: string | number;
  categories: { category: { id: string; name: string } }[];
}

interface BucketGroup {
  bucketName: string;
  budgetAmount: number;
  transactions: Transaction[];
  total: number;
}

export default function OverviewPage() {
  const i18n = useTranslations("overview");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<BudgetBucket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const startDate = new Date(year, month, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

    const [txRes, catRes, budgetRes] = await Promise.all([
      fetch(`/api/transaction?startDate=${startDate}&endDate=${endDate}&pageSize=0`),
      fetch("/api/category"),
      fetch("/api/budget-buckets"),
    ]);

    const [txData, catData, budgetData] = await Promise.all([
      txRes.json(),
      catRes.json(),
      budgetRes.json(),
    ]);

    setTransactions(txData.transactions || txData);
    setCategories(catData);
    setBudgets(budgetData);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const handleUpdateCategory = async (transactionId: string, categoryId: string | null) => {
    await fetch(`/api/transaction/${transactionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });
    await fetchData();
  };

  // Group transactions by budget bucket
  const categoryToBucket = new Map<string, string>();
  budgets.forEach((b) => {
    b.categories.forEach((bc) => {
      categoryToBucket.set(bc.category.id, b.name);
    });
  });

  const bucketGroups = new Map<string, Transaction[]>();
  const uncategorized: Transaction[] = [];
  const others: Transaction[] = [];

  budgets.forEach((b) => {
    bucketGroups.set(b.name, []);
  });

  transactions.forEach((tx) => {
    if (!tx.categoryId) {
      uncategorized.push(tx);
    } else if (!categoryToBucket.has(tx.categoryId)) {
      others.push(tx);
    } else {
      const bucketName = categoryToBucket.get(tx.categoryId)!;
      const list = bucketGroups.get(bucketName) ?? [];
      list.push(tx);
      bucketGroups.set(bucketName, list);
    }
  });

  const bucketGroupArray: BucketGroup[] = Array.from(bucketGroups.entries()).map(
    ([bucketName, txs]) => {
      const budget = budgets.find((b) => b.name === bucketName);
      return {
        bucketName,
        budgetAmount: parseFloat(String(budget?.amount ?? 0)),
        transactions: txs,
        total: txs.reduce((sum, t) => sum + parseFloat(String(t.amount)), 0),
      };
    }
  );

  // Calculate totals (exclude transfer transactions only)
  const transferCategory = categories.find(
    (c) => !c.parentId && c.name.toLowerCase() === "transfer"
  );
  const transferCategoryIds = new Set<string>();
  if (transferCategory) {
    transferCategoryIds.add(transferCategory.id);
    transferCategory.children?.forEach((ch) => transferCategoryIds.add(ch.id));
  }

  const nonTransferTransactions = transactions.filter(
    (t) => !t.categoryId || !transferCategoryIds.has(t.categoryId)
  );

  const totalIncome = nonTransferTransactions
    .filter((t) => parseFloat(String(t.amount)) > 0)
    .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);

  const totalExpenses = nonTransferTransactions
    .filter((t) => parseFloat(String(t.amount)) < 0)
    .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);

  const othersTotal = others.reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);

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
        <MonthPicker year={year} month={month} onChange={handleMonthChange} />
      </div>

      <div className="mb-6">
        <MonthlySummaryHeader totalIncome={totalIncome} totalExpenses={totalExpenses} />
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          title={i18n("noTransactions")}
          description={i18n("noTransactionsDesc")}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {bucketGroupArray.map((group) => (
            <BucketCard
              key={group.bucketName}
              name={group.bucketName}
              total={group.total}
              budgetAmount={group.budgetAmount}
              transactions={group.transactions}
              categories={categories}
              onUpdateCategory={handleUpdateCategory}
            />
          ))}
          {others.length > 0 && (
            <BucketCard
              name={i18n("others")}
              total={othersTotal}
              budgetAmount={0}
              transactions={others}
              categories={categories}
              onUpdateCategory={handleUpdateCategory}
            />
          )}
          {[50,55,60,65,70,75,80,85,90,95,100].map((pct) => (
            <BucketCard
              key={`demo-${pct}`}
              name={`demo-${pct}%`}
              total={-pct}
              budgetAmount={100}
              transactions={[]}
            />
          ))}
          <UncategorizedSection
            transactions={uncategorized}
            categories={categories}
            onUpdateCategory={handleUpdateCategory}
          />
        </div>
      )}
    </div>
  );
}
