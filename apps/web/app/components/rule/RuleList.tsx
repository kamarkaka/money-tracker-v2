"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PencilSquareIcon, TrashIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { FormField } from "@/app/components/ui/FormField";

interface Category {
  id: string;
  name: string;
}

interface Rule {
  id: string;
  sequence: number;
  match: string;
  categoryId: string;
  category: { id: string; name: string; parentId: string | null; parent?: { name: string } | null };
}

interface RuleListProps {
  rules: Rule[];
  categories: Category[];
  onUpdate: (id: string, match: string, categoryId: string) => Promise<void>;
  onDelete: (id: string) => void;
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

export function RuleList({ rules, categories, onUpdate, onDelete }: RuleListProps) {
  const i18n = useTranslations("rule");
  const i18nc = useTranslations("common");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMatch, setEditMatch] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const startEdit = (rule: Rule) => {
    setEditingId(rule.id);
    setEditMatch(rule.match);
    setEditCategoryId(rule.categoryId);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!editingId || !editMatch.trim() || !editCategoryId) return;
    setSaving(true);
    try {
      await onUpdate(editingId, editMatch.trim(), editCategoryId);
      setEditingId(null);
    } catch {
      // error handled upstream
    } finally {
      setSaving(false);
    }
  };

  const categoryLabel = (rule: Rule) => {
    if (rule.category.parent) return `${rule.category.parent.name} > ${rule.category.name}`;
    return rule.category.name;
  };

  return (
    <div className="flex flex-col gap-4">
      {rules.map((rule, index) => (
        <div
          key={rule.id}
          className={`card-hover rounded-lg border border-card-border bg-gradient-to-r p-5 shadow-sm ${CARD_GRADIENTS[index % CARD_GRADIENTS.length]}`}
        >
          {editingId === rule.id ? (
            <div className="flex flex-col gap-3">
              <FormField label={i18n("matchString")}>
                <input
                  type="text"
                  value={editMatch}
                  onChange={(e) => setEditMatch(e.target.value)}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
                />
              </FormField>
              <FormField label={i18n("targetCategory")}>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </FormField>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
                >
                  {saving ? i18nc("saving") : i18nc("save")}
                </button>
                <button
                  onClick={cancelEdit}
                  className="cursor-pointer rounded-md border border-card-border px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-accent-subtle hover:text-accent dark:text-zinc-300"
                >
                  {i18nc("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div
                className="flex cursor-pointer items-center justify-between md:cursor-default"
                onClick={() => setActiveId(activeId === rule.id ? null : rule.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {rule.match}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                    <ArrowRightIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>{categoryLabel(rule)}</span>
                  </div>
                </div>
                {/* Desktop buttons */}
                <div className="hidden gap-2 md:flex">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(rule); }}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-accent-subtle text-accent hover:bg-accent hover:text-accent-text"
                    title={i18nc("edit")}
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(rule.id); }}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50"
                    title={i18nc("delete")}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {/* Mobile action buttons */}
              {activeId === rule.id && (
                <div className="mt-3 flex justify-center gap-4 border-t border-card-border pt-3 md:hidden">
                  <button
                    onClick={() => { startEdit(rule); setActiveId(null); }}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-text shadow-sm hover:bg-accent-hover"
                  >
                    <PencilSquareIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => { onDelete(rule.id); setActiveId(null); }}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
