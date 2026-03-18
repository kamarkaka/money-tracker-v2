"use client";

import { useTranslations } from "next-intl";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";

interface CategoryRowProps {
  category: {
    id: string;
    name: string;
    parentId: string | null;
  };
  isChild?: boolean;
  onEdit: (category: { id: string; name: string; parentId: string | null }) => void;
  onDelete: (id: string) => void;
}

export function CategoryRow({ category, isChild = false, onEdit, onDelete }: CategoryRowProps) {
  const i18nc = useTranslations("common");
  return (
    <div
      className={`flex items-center justify-between rounded-md px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
        isChild ? "ml-8" : ""
      }`}
    >
      <span className="text-sm text-zinc-900 dark:text-zinc-100">{category.name}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onEdit(category)}
          className="cursor-pointer rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
          title={i18nc("edit")}
        >
          <PencilSquareIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(category.id)}
          className="cursor-pointer rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
          title={i18nc("delete")}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
