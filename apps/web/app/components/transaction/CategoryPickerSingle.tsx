"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

interface CategoryPickerSingleProps {
  categories: Category[];
  selectedId: string;
  onChange: (id: string) => void;
}

export function CategoryPickerSingle({ categories, selectedId, onChange }: CategoryPickerSingleProps) {
  const i18n = useTranslations("transaction");

  const categoryOptions = useMemo(() => {
    const opts: { id: string; label: string }[] = [];
    for (const parent of categories.filter((c) => !c.parentId)) {
      opts.push({ id: parent.id, label: parent.name });
      if (parent.children) {
        for (const child of parent.children) {
          opts.push({ id: child.id, label: `${parent.name} > ${child.name}` });
        }
      }
    }
    return opts;
  }, [categories]);

  return (
    <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
      <button
        type="button"
        onClick={() => onChange("")}
        className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
          selectedId === ""
            ? "border-accent bg-accent text-white"
            : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        }`}
      >
        {i18n("none")}
      </button>
      {categoryOptions.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            selectedId === c.id
              ? "border-accent bg-accent text-white"
              : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
