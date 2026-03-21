"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TrashIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { CategoryPicker } from "./CreateBucketForm";
import { FormField } from "@/app/components/ui/FormField";
import { CurrencyInput } from "@/app/components/ui/CurrencyInput";
import { formatCurrency } from "@/app/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface BudgetBucket {
  id: string;
  name: string;
  amount: string | number;
  categories: { category: Category }[];
}

interface BucketEditorProps {
  bucket: BudgetBucket;
  allCategories: Category[];
  assignedCategoryIds: Set<string>;
  onUpdate: (id: string, name: string, categoryIds: string[], amount: number) => Promise<void>;
  onDelete: (id: string) => void;
}

export function BucketEditor({
  bucket,
  allCategories,
  assignedCategoryIds,
  onUpdate,
  onDelete,
}: BucketEditorProps) {
  const i18n = useTranslations("budget");
  const i18nc = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(bucket.name);
  const [amount, setAmount] = useState(String(bucket.amount));
  const [selectedIds, setSelectedIds] = useState<string[]>(
    bucket.categories.map((bc) => bc.category.id)
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const origIds = bucket.categories.map((bc) => bc.category.id).sort().join(",");
    const newIds = [...selectedIds].sort().join(",");
    const nameUnchanged = name === bucket.name;
    const amountUnchanged = (parseFloat(amount) || 0) === Number(bucket.amount);
    const categoriesUnchanged = origIds === newIds;
    if (nameUnchanged && amountUnchanged && categoriesUnchanged) {
      setEditing(false);
      return;
    }

    setLoading(true);
    try {
      await onUpdate(bucket.id, name, selectedIds, parseFloat(amount) || 0);
      setEditing(false);
    } catch {
      // error handled upstream
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(bucket.name);
    setAmount(String(bucket.amount));
    setSelectedIds(bucket.categories.map((bc) => bc.category.id));
    setEditing(false);
  };

  return (
    <div className="card-hover rounded-lg border border-card-border bg-card-bg p-5">
      {editing ? (
        <div className="flex flex-col gap-4">
          <FormField label={i18n("budgetName")}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
            />
          </FormField>
          <FormField label={i18n("monthlyAmount")}>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
            />
          </FormField>
          <FormField label={i18n("categories")}>
            <CategoryPicker
              allCategories={allCategories}
              assignedCategoryIds={assignedCategoryIds}
              selectedIds={selectedIds}
              onChange={setSelectedIds}
            />
          </FormField>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? i18nc("saving") : i18nc("save")}
            </button>
            <button
              onClick={handleCancel}
              className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {i18nc("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {bucket.name}
              </h3>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {formatCurrency(bucket.amount)}/mo
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {bucket.categories.length === 0 ? (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {i18n("noCategoriesAssigned")}
                </span>
              ) : (
                bucket.categories.map((bc) => (
                  <span
                    key={bc.category.id}
                    className="inline-flex rounded-full bg-accent-subtle px-2.5 py-0.5 text-xs font-medium text-accent"
                  >
                    {bc.category.name}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="cursor-pointer rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              title={i18nc("edit")}
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(bucket.id)}
              className="cursor-pointer rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
              title={i18nc("delete")}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
