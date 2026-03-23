"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon } from "@heroicons/react/24/outline";
import { ProOnly } from "@/app/components/ProOnly";
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
  const [formOpen, setFormOpen] = useState(false);

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
    setFormOpen(false);
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
    <ProOnly>
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{i18n("title")}</h1>
      </div>

      <div className="sticky top-0 z-30 mb-4 max-h-[70vh] overflow-hidden overflow-y-auto rounded-lg border border-card-border bg-gradient-to-r from-blue-50 to-white shadow-sm dark:from-blue-950 dark:to-zinc-900 md:top-16">
        <button
          onClick={() => setFormOpen(!formOpen)}
          className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left"
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-text"
            style={{ transition: "transform 0.3s ease", transform: formOpen ? "rotate(45deg)" : "rotate(0deg)" }}
          >
            <PlusIcon className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {i18n("createBudget")}
          </span>
        </button>
        {formOpen && (
          <div className="border-t border-card-border px-5 pb-5 pt-4">
            <CreateBucketForm
              allCategories={allFlatCategories}
              assignedCategoryIds={assignedCategoryIds}
              onSubmit={handleCreate}
            />
          </div>
        )}
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
    </ProOnly>
  );
}
