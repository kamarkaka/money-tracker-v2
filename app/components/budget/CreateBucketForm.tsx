"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/app/components/ui/FormField";

interface Category {
  id: string;
  name: string;
}

interface CategoryPickerProps {
  allCategories: Category[];
  assignedCategoryIds: Set<string>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function CategoryPicker({
  allCategories,
  assignedCategoryIds,
  selectedIds,
  onChange,
}: CategoryPickerProps) {
  const i18n = useTranslations("budget");
  const availableCategories = allCategories.filter(
    (c) => !assignedCategoryIds.has(c.id) || selectedIds.includes(c.id)
  );

  const toggleCategory = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {availableCategories.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {i18n("noCategoriesAssigned")}
        </p>
      ) : (
        availableCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => toggleCategory(cat.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              selectedIds.includes(cat.id)
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-400"
            }`}
          >
            {cat.name}
          </button>
        ))
      )}
    </div>
  );
}

interface CreateBucketFormProps {
  allCategories: Category[];
  assignedCategoryIds: Set<string>;
  onSubmit: (name: string, categoryIds: string[], amount: number) => Promise<void>;
}

export function CreateBucketForm({
  allCategories,
  assignedCategoryIds,
  onSubmit,
}: CreateBucketFormProps) {
  const i18n = useTranslations("budget");
  const i18nc = useTranslations("common");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onSubmit(name.trim(), selectedIds, parseFloat(amount) || 0);
      setName("");
      setAmount("");
      setSelectedIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : i18nc("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label={i18n("budgetName")}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder=""
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
        />
      </FormField>
      <FormField label={i18n("monthlyAmount")}>
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
      <FormField label={i18n("categories")}>
        <CategoryPicker
          allCategories={allCategories}
          assignedCategoryIds={assignedCategoryIds}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
        />
      </FormField>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? i18nc("adding") : i18n("createBudget")}
      </button>
    </form>
  );
}
