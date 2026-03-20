"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { PencilSquareIcon, TrashIcon, Bars3Icon } from "@heroicons/react/24/outline";
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
  onReorder: (ruleIds: string[]) => Promise<void>;
}

export function RuleList({ rules, categories, onUpdate, onDelete, onReorder }: RuleListProps) {
  const i18n = useTranslations("rule");
  const i18nc = useTranslations("common");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMatch, setEditMatch] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  const handleDragStart = (index: number) => {
    dragItem.current = index;
    setDragIndex(index);
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const ids = rules.map((r) => r.id);
      const [removed] = ids.splice(dragItem.current, 1);
      ids.splice(dragOverItem.current, 0, removed);
      onReorder(ids);
    }
    dragItem.current = null;
    dragOverItem.current = null;
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const categoryLabel = (rule: Rule) => {
    if (rule.category.parent) return `${rule.category.parent.name} > ${rule.category.name}`;
    return rule.category.name;
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-700">
        <div className="flex items-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <span className="w-12 text-center">#</span>
          <span className="w-8"></span>
          <span className="flex-1">{i18n("matchString")}</span>
          <span className="w-48">{i18n("targetCategory")}</span>
          <span className="w-20"></span>
        </div>
      </div>
      {rules.map((rule, index) => (
        <div
          key={rule.id}
          draggable={editingId !== rule.id}
          onDragStart={() => handleDragStart(index)}
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => e.preventDefault()}
          className={`flex items-center border-b border-zinc-100 px-5 py-3 last:border-b-0 dark:border-zinc-800 ${
            dragIndex === index ? "opacity-40" : ""
          } ${
            dragOverIndex === index && dragIndex !== index
              ? "border-t-2 border-t-blue-400 dark:border-t-blue-500"
              : ""
          }`}
        >
          {editingId === rule.id ? (
            <div className="flex flex-1 items-end gap-3">
              <span className="w-12 shrink-0 text-center text-sm text-zinc-400">{index + 1}</span>
              <FormField label={i18n("matchString")} className="flex-1">
                <input
                  type="text"
                  value={editMatch}
                  onChange={(e) => setEditMatch(e.target.value)}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </FormField>
              <FormField label={i18n("targetCategory")} className="w-48">
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </FormField>
              <div className="flex gap-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="cursor-pointer rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {saving ? i18nc("saving") : i18nc("save")}
                </button>
                <button
                  onClick={cancelEdit}
                  className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {i18nc("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <span className="w-12 shrink-0 text-center text-sm font-medium text-zinc-400 dark:text-zinc-500">
                {index + 1}
              </span>
              <span className="w-8 shrink-0 cursor-grab text-zinc-300 active:cursor-grabbing dark:text-zinc-600">
                <Bars3Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 text-sm text-zinc-900 dark:text-zinc-100">
                {rule.match}
              </span>
              <span className="w-48 text-sm text-zinc-600 dark:text-zinc-400">
                {categoryLabel(rule)}
              </span>
              <div className="flex w-20 justify-end gap-1">
                <button
                  onClick={() => startEdit(rule)}
                  className="cursor-pointer rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                  title={i18nc("edit")}
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(rule.id)}
                  className="cursor-pointer rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                  title={i18nc("delete")}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
