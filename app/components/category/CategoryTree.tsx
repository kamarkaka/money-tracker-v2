"use client";

import { useState } from "react";
import { TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

interface CategoryTreeProps {
  categories: Category[];
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

export function CategoryTree({ categories, onDelete }: CategoryTreeProps) {
  const i18nc = useTranslations("common");
  const [activeId, setActiveId] = useState<string | null>(null);
  const parentCategories = categories.filter((c) => !c.parentId);

  return (
    <div className="flex flex-col gap-4">
      {parentCategories.map((parent, index) => (
        <div
          key={parent.id}
          className={`card-hover rounded-lg border border-card-border bg-gradient-to-r p-5 shadow-sm ${CARD_GRADIENTS[index % CARD_GRADIENTS.length]}`}
        >
          <div
            className="flex cursor-pointer items-center justify-between md:cursor-default"
            onClick={() => setActiveId(activeId === parent.id ? null : parent.id)}
          >
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {parent.name}
            </h3>
            {/* Desktop delete button */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(parent.id); }}
              className="hidden h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 md:flex"
              title={i18nc("delete")}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
          {parent.children && parent.children.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {parent.children.map((child) => (
                <span
                  key={child.id}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-medium text-zinc-700 shadow-sm dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {child.name}
                  <button
                    onClick={() => onDelete(child.id)}
                    className="cursor-pointer rounded-full p-0.5 text-zinc-400 hover:text-red-500"
                    title={i18nc("delete")}
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {/* Mobile delete button */}
          {activeId === parent.id && (
            <div className="mt-3 flex justify-center border-t border-card-border pt-3 md:hidden">
              <button
                onClick={() => { onDelete(parent.id); setActiveId(null); }}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
