"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { BucketList } from "@/app/components/budget/BucketList";
import { CreateBucketForm } from "@/app/components/budget/CreateBucketForm";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

interface BudgetBucket {
  id: string;
  name: string;
  icon?: string | null;
  amount: string | number;
  categories: { category: { id: string; name: string } }[];
}

export default function BudgetPage() {
  const i18n = useTranslations("budget");
  const [budgets, setBudgets] = useState<BudgetBucket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    const [budgetRes, catRes] = await Promise.all([
      fetch("/api/budget-buckets"),
      fetch("/api/category"),
    ]);
    const [budgetData, catData] = await Promise.all([budgetRes.json(), catRes.json()]);
    setBudgets(budgetData);
    setCategories(catData);

    // Compute spending per bucket
    const categoryToBucket = new Map<string, string>();
    for (const b of budgetData) {
      for (const bc of b.categories) {
        categoryToBucket.set(bc.category.id, b.id);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Flatten categories for the picker (only from top-level parents to avoid duplicates)
  const allFlatCategories = categories
    .filter((c) => !c.parentId)
    .flatMap((c) => [
      { id: c.id, name: c.name },
      ...(c.children?.map((ch) => ({ id: ch.id, name: `${c.name} > ${ch.name}` })) ?? []),
  ]);

  // Collect all category IDs already assigned to a bucket
  const assignedCategoryIds = new Set(
    budgets.flatMap((b) => b.categories.map((bc) => bc.category.id))
  );

  const handleCreate = async (name: string, categoryIds: string[], amount: number, icon: string) => {
    const res = await fetch("/api/budget-buckets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, categoryIds, amount, icon }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchData();
  };

  const handleUpdate = async (id: string, name: string, categoryIds: string[], amount: number, icon: string) => {
    const res = await fetch(`/api/budget-buckets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, categoryIds, amount, icon }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchData();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`/api/budget-buckets/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    setDeleting(false);
    await fetchData();
  };

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
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{i18n("title")}</h1>
      </div>

      <div className="mb-8 rounded-lg border border-card-border bg-card-bg p-6">
        <CreateBucketForm
          allCategories={allFlatCategories}
          assignedCategoryIds={assignedCategoryIds}
          onSubmit={handleCreate}
        />
      </div>

      {budgets.length === 0 ? (
        <EmptyState
          title={i18n("noBudgets")}
          description={i18n("noBudgetsDesc")}
        />
      ) : (
        <BucketList
          budgets={budgets}
          allCategories={allFlatCategories}
          assignedCategoryIds={assignedCategoryIds}
          onUpdate={handleUpdate}
          onDelete={(id) => setDeleteId(id)}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={i18n("deleteBudget")}
        message={i18n("deleteWarning")}
        loading={deleting}
      />
    </div>
  );
}
