"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TrashIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { CategoryPicker } from "./CreateBucketForm";
import { FormField } from "@/app/components/ui/FormField";
import { CurrencyInput } from "@/app/components/ui/CurrencyInput";
import { BudgetIconPicker, getBudgetIcon, getBudgetIconColor } from "./BudgetIconPicker";
import { formatCurrency } from "@/app/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface BudgetBucket {
  id: string;
  name: string;
  icon?: string | null;
  amount: string | number;
  categories: { category: Category }[];
}

const CARD_GRADIENTS = [
  "from-blue-50 to-white dark:from-blue-950 dark:to-zinc-900",
  "from-emerald-50 to-white dark:from-emerald-950 dark:to-zinc-900",
  "from-violet-50 to-white dark:from-violet-950 dark:to-zinc-900",
  "from-amber-50 to-white dark:from-amber-950 dark:to-zinc-900",
  "from-rose-50 to-white dark:from-rose-950 dark:to-zinc-900",
  "from-teal-50 to-white dark:from-teal-950 dark:to-zinc-900",
  "from-orange-50 to-white dark:from-orange-950 dark:to-zinc-900",
  "from-indigo-50 to-white dark:from-indigo-950 dark:to-zinc-900",
];

interface BucketEditorProps {
  bucket: BudgetBucket;
  colorIndex?: number;
  allCategories: Category[];
  assignedCategoryIds: Set<string>;
  onUpdate: (id: string, name: string, categoryIds: string[], amount: number, icon: string) => Promise<void>;
  onDelete: (id: string) => void;
}

export function BucketEditor({
  bucket,
  colorIndex = 0,
  allCategories,
  assignedCategoryIds,
  onUpdate,
  onDelete,
}: BucketEditorProps) {
  const i18n = useTranslations("budget");
  const i18nc = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [name, setName] = useState(bucket.name);
  const [icon, setIcon] = useState(bucket.icon || "");
  const [amount, setAmount] = useState(String(bucket.amount));
  const [selectedIds, setSelectedIds] = useState<string[]>(
    bucket.categories.map((bc) => bc.category.id)
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const origIds = bucket.categories.map((bc) => bc.category.id).sort().join(",");
    const newIds = [...selectedIds].sort().join(",");
    const nameUnchanged = name === bucket.name;
    const iconUnchanged = icon === (bucket.icon || "");
    const amountUnchanged = (parseFloat(amount) || 0) === Number(bucket.amount);
    const categoriesUnchanged = origIds === newIds;
    if (nameUnchanged && iconUnchanged && amountUnchanged && categoriesUnchanged) {
      setEditing(false);
      return;
    }

    setLoading(true);
    try {
      await onUpdate(bucket.id, name, selectedIds, parseFloat(amount) || 0, icon);
      setEditing(false);
    } catch {
      // error handled upstream
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(bucket.name);
    setIcon(bucket.icon || "");
    setAmount(String(bucket.amount));
    setSelectedIds(bucket.categories.map((bc) => bc.category.id));
    setEditing(false);
  };

  return (
    <div className={`card-hover rounded-lg border border-card-border bg-gradient-to-r shadow-sm p-5 ${CARD_GRADIENTS[colorIndex % CARD_GRADIENTS.length]}`}>
      {editing ? (
        <div className="flex flex-col gap-4">
          <FormField label={i18n("budgetName")}>
            <div className="flex items-center gap-2">
              <BudgetIconPicker selected={icon} onChange={setIcon} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
              />
            </div>
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
        <div>
          <div
            className="flex cursor-pointer items-start justify-between gap-2 md:cursor-default"
            onClick={() => setShowActions(!showActions)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = getBudgetIcon(bucket.icon);
                  const color = getBudgetIconColor(colorIndex);
                  return Icon ? (
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color.solid}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  ) : null;
                })()}
                <h3 className="min-w-0 flex-1 truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {bucket.name}
                </h3>
                <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                  {i18n("perMonth", { amount: formatCurrency(Math.round(Number(bucket.amount)), "USD", true) })}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {bucket.categories.length === 0 ? (
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {i18n("noCategoriesAssigned")}
                  </span>
                ) : (
                  bucket.categories.map((bc) => {
                    const color = getBudgetIconColor(colorIndex);
                    return (
                    <span
                      key={bc.category.id}
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}
                    >
                      {bc.category.name}
                    </span>
                    );
                  })
                )}
              </div>
            </div>
            {/* Desktop buttons */}
            <div className="hidden gap-2 md:flex">
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                className="cursor-pointer rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                title={i18nc("edit")}
              >
                <PencilSquareIcon className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(bucket.id); }}
                className="cursor-pointer rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                title={i18nc("delete")}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* Mobile action buttons */}
          {showActions && (
            <div className="mt-3 flex justify-center gap-4 border-t border-card-border pt-3 md:hidden">
              <button
                onClick={() => { setEditing(true); setShowActions(false); }}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-text shadow-sm hover:bg-accent-hover"
              >
                <PencilSquareIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => { onDelete(bucket.id); setShowActions(false); }}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
