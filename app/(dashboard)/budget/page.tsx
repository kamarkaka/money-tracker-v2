"use client";

import { useState, useEffect, useCallback } from "react";
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
  amount: string | number;
  categories: { category: { id: string; name: string } }[];
}

export default function BudgetPage() {
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

  const handleCreate = async (name: string, categoryIds: string[], amount: number) => {
    const res = await fetch("/api/budget-buckets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, categoryIds, amount }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchData();
  };

  const handleUpdate = async (id: string, name: string, categoryIds: string[], amount: number) => {
    const res = await fetch(`/api/budget-buckets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, categoryIds, amount }),
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
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Budgets</h1>
      </div>

      <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Create New Budget
        </h2>
        <CreateBucketForm
          allCategories={allFlatCategories}
          assignedCategoryIds={assignedCategoryIds}
          onSubmit={handleCreate}
        />
      </div>

      {budgets.length === 0 ? (
        <EmptyState
          title="No budgets yet"
          description="Create your first budget above to start grouping categories."
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
        title="Delete Budget"
        message="Are you sure you want to delete this budget? Categories will be unassigned but not deleted."
        loading={deleting}
      />
    </div>
  );
}
