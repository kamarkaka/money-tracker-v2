"use client";

import { useState } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { CategoryRow } from "./CategoryRow";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

interface CategoryTreeProps {
  categories: Category[];
  onEdit: (category: { id: string; name: string; parentId: string | null }) => void;
  onDelete: (id: string) => void;
}

function ParentCategoryGroup({
  parent,
  onEdit,
  onDelete,
}: {
  parent: Category;
  onEdit: CategoryTreeProps["onEdit"];
  onDelete: CategoryTreeProps["onDelete"];
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = parent.children && parent.children.length > 0;

  return (
    <div>
      <div className="flex items-center">
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="cursor-pointer ml-2 flex items-center justify-center rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
          >
            <ChevronRightIcon
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
          </button>
        ) : (
          <span className="ml-2 w-6" />
        )}
        <div className="flex-1">
          <CategoryRow category={parent} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
      {hasChildren && expanded && (
        <div className="mb-2">
          {parent.children!.map((child) => (
            <CategoryRow
              key={child.id}
              category={child}
              isChild
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryTree({ categories, onEdit, onDelete }: CategoryTreeProps) {
  const parentCategories = categories.filter((c) => !c.parentId);

  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {parentCategories.map((parent) => (
        <ParentCategoryGroup
          key={parent.id}
          parent={parent}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
