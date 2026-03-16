"use client";

import { useState } from "react";
import { TrashIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { CategoryPicker } from "./CreateBucketForm";
import { FormField } from "@/app/components/ui/FormField";
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
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(bucket.name);
  const [amount, setAmount] = useState(String(bucket.amount));
  const [selectedIds, setSelectedIds] = useState<string[]>(
    bucket.categories.map((bc) => bc.category.id)
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
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
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      {editing ? (
        <div className="flex flex-col gap-4">
          <FormField label="Budget Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </FormField>
          <FormField label="Monthly Amount">
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </FormField>
          <FormField label="Categories">
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
              className="cursor-pointer rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleCancel}
              className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
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
                  No categories assigned
                </span>
              ) : (
                bucket.categories.map((bc) => (
                  <span
                    key={bc.category.id}
                    className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
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
              title="Edit budget"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(bucket.id)}
              className="cursor-pointer rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
              title="Delete budget"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
