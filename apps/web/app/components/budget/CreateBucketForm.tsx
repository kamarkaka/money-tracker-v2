"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/app/components/ui/FormField";
import { CurrencyInput } from "@/app/components/ui/CurrencyInput";
import { BudgetIconPicker } from "./BudgetIconPicker";

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
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors md:px-3 md:py-1 md:text-xs ${
              selectedIds.includes(cat.id)
                ? "border-accent bg-accent text-white"
                : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
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
  onSubmit: (name: string, categoryIds: string[], amount: number, icon: string) => Promise<void>;
}

export function CreateBucketForm({
  allCategories,
  assignedCategoryIds,
  onSubmit,
}: CreateBucketFormProps) {
  const i18n = useTranslations("budget");
  const i18nc = useTranslations("common");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
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
      await onSubmit(name.trim(), selectedIds, parseFloat(amount) || 0, icon);
      setName("");
      setIcon("");
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
      <div className="flex flex-col items-center gap-2">
        <BudgetIconPicker selected={icon} onChange={setIcon} size="lg" />
        <span className="text-xs text-zinc-400 dark:text-zinc-500">{i18n("pickIcon")}</span>
      </div>
      <div className="flex gap-3">
        <FormField label={i18n("budgetName")} className="w-3/5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={i18n("namePlaceholder")}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
          />
        </FormField>
        <FormField label={i18n("monthlyAmount")} className="w-2/5">
          <CurrencyInput
            value={amount}
            onChange={setAmount}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
          />
        </FormField>
      </div>
      <FormField label={i18n("categories")}>
        <div className="max-h-32 overflow-y-auto">
          <CategoryPicker
            allCategories={allCategories}
            assignedCategoryIds={assignedCategoryIds}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
          />
        </div>
      </FormField>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full cursor-pointer rounded-md bg-accent px-4 py-3 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50 md:w-auto md:py-2"
      >
        {loading ? i18nc("adding") : i18n("createBudget")}
      </button>
    </form>
  );
}
