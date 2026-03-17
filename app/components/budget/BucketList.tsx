"use client";

import { BucketEditor } from "./BucketEditor";

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

interface BucketListProps {
  budgets: BudgetBucket[];
  allCategories: Category[];
  assignedCategoryIds: Set<string>;
  spending: Record<string, number>;
  onUpdate: (id: string, name: string, categoryIds: string[], amount: number) => Promise<void>;
  onDelete: (id: string) => void;
}

export function BucketList({
  budgets,
  allCategories,
  assignedCategoryIds,
  spending,
  onUpdate,
  onDelete,
}: BucketListProps) {
  return (
    <div className="flex flex-col gap-4">
      {budgets.map((bucket) => (
        <BucketEditor
          key={bucket.id}
          bucket={bucket}
          allCategories={allCategories}
          assignedCategoryIds={assignedCategoryIds}
          spent={spending[bucket.id] || 0}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
