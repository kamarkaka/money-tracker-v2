"use client";

import { useState } from "react";
import { PlusIcon, XMarkIcon, PencilIcon, CheckIcon } from "@heroicons/react/24/outline";

interface CategoryGroup {
  name: string;
  checked: boolean;
  editing: boolean;
  children: { name: string; checked: boolean; editing: boolean }[];
}

const DEFAULT_CATEGORIES: CategoryGroup[] = [
  {
    name: "Essentials", checked: true, editing: false,
    children: [
      { name: "Groceries", checked: true, editing: false },
      { name: "Rent / Mortgage", checked: true, editing: false },
      { name: "Utilities", checked: true, editing: false },
      { name: "Insurance", checked: true, editing: false },
      { name: "Healthcare", checked: true, editing: false },
    ],
  },
  {
    name: "Transportation", checked: true, editing: false,
    children: [
      { name: "Gas", checked: true, editing: false },
      { name: "Public Transit", checked: true, editing: false },
      { name: "Car Maintenance", checked: true, editing: false },
    ],
  },
  {
    name: "Food & Dining", checked: true, editing: false,
    children: [
      { name: "Restaurants", checked: true, editing: false },
      { name: "Coffee Shops", checked: true, editing: false },
      { name: "Fast Food", checked: true, editing: false },
    ],
  },
  {
    name: "Entertainment", checked: true, editing: false,
    children: [
      { name: "Streaming Services", checked: true, editing: false },
      { name: "Movies & Events", checked: true, editing: false },
      { name: "Hobbies", checked: true, editing: false },
    ],
  },
  {
    name: "Shopping", checked: true, editing: false,
    children: [
      { name: "Clothing", checked: true, editing: false },
      { name: "Electronics", checked: true, editing: false },
      { name: "Home & Garden", checked: true, editing: false },
    ],
  },
  {
    name: "Personal", checked: true, editing: false,
    children: [
      { name: "Education", checked: true, editing: false },
      { name: "Fitness", checked: true, editing: false },
      { name: "Personal Care", checked: true, editing: false },
    ],
  },
  {
    name: "Kids & Family", checked: true, editing: false,
    children: [
      { name: "Childcare / Daycare", checked: true, editing: false },
      { name: "School Supplies & Tuition", checked: true, editing: false },
      { name: "Kids Activities", checked: true, editing: false },
      { name: "Kids Clothing", checked: true, editing: false },
      { name: "Baby Supplies", checked: true, editing: false },
    ],
  },
  {
    name: "Income", checked: true, editing: false,
    children: [
      { name: "Salary", checked: true, editing: false },
      { name: "Freelance", checked: true, editing: false },
      { name: "Investments", checked: true, editing: false },
    ],
  },
  {
    name: "Transfer", checked: true, editing: false,
    children: [],
  },
];

interface CategorySetupStepProps {
  onNext: (createdCategories: CategoryGroup[]) => void;
  onSkip: () => void;
}

export function CategorySetupStep({ onNext, onSkip }: CategorySetupStepProps) {
  const [categories, setCategories] = useState<CategoryGroup[]>(
    DEFAULT_CATEGORIES.map((g) => ({ ...g, children: g.children.map((c) => ({ ...c })) }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newParentName, setNewParentName] = useState("");
  const [addingChildTo, setAddingChildTo] = useState<number | null>(null);
  const [newChildName, setNewChildName] = useState("");

  const toggleParent = (idx: number) => {
    setCategories((prev) => {
      const next = [...prev];
      const checked = !next[idx].checked;
      next[idx] = { ...next[idx], checked, children: next[idx].children.map((c) => ({ ...c, checked })) };
      return next;
    });
  };

  const toggleChild = (parentIdx: number, childIdx: number) => {
    setCategories((prev) => {
      const next = [...prev];
      const children = [...next[parentIdx].children];
      children[childIdx] = { ...children[childIdx], checked: !children[childIdx].checked };
      next[parentIdx] = { ...next[parentIdx], children };
      // If all children unchecked, uncheck parent; if any checked, check parent
      const anyChecked = children.some((c) => c.checked);
      next[parentIdx] = { ...next[parentIdx], checked: anyChecked, children };
      return next;
    });
  };

  const startEditParent = (idx: number) => {
    setCategories((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], editing: true };
      return next;
    });
  };

  const finishEditParent = (idx: number, newName: string) => {
    setCategories((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], name: newName.trim() || next[idx].name, editing: false };
      return next;
    });
  };

  const startEditChild = (parentIdx: number, childIdx: number) => {
    setCategories((prev) => {
      const next = [...prev];
      const children = [...next[parentIdx].children];
      children[childIdx] = { ...children[childIdx], editing: true };
      next[parentIdx] = { ...next[parentIdx], children };
      return next;
    });
  };

  const finishEditChild = (parentIdx: number, childIdx: number, newName: string) => {
    setCategories((prev) => {
      const next = [...prev];
      const children = [...next[parentIdx].children];
      children[childIdx] = { ...children[childIdx], name: newName.trim() || children[childIdx].name, editing: false };
      next[parentIdx] = { ...next[parentIdx], children };
      return next;
    });
  };

  const removeParent = (idx: number) => {
    setCategories((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeChild = (parentIdx: number, childIdx: number) => {
    setCategories((prev) => {
      const next = [...prev];
      const children = next[parentIdx].children.filter((_, i) => i !== childIdx);
      next[parentIdx] = { ...next[parentIdx], children };
      return next;
    });
  };

  const addParent = () => {
    if (!newParentName.trim()) return;
    setCategories((prev) => [
      ...prev,
      { name: newParentName.trim(), checked: true, editing: false, children: [] },
    ]);
    setNewParentName("");
  };

  const addChild = (parentIdx: number) => {
    if (!newChildName.trim()) return;
    setCategories((prev) => {
      const next = [...prev];
      next[parentIdx] = {
        ...next[parentIdx],
        children: [...next[parentIdx].children, { name: newChildName.trim(), checked: true, editing: false }],
      };
      return next;
    });
    setNewChildName("");
    setAddingChildTo(null);
  };

  const handleAccept = async () => {
    const selected = categories
      .filter((g) => g.checked)
      .map((g) => ({
        name: g.name,
        children: g.children.filter((c) => c.checked).map((c) => c.name),
      }));

    if (selected.length === 0) {
      onSkip();
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/categories/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: selected }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create categories");
        return;
      }

      onNext(categories.filter((g) => g.checked));
    } catch {
      setError("Failed to create categories");
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = categories.reduce(
    (sum, g) => sum + (g.checked ? 1 : 0) + g.children.filter((c) => c.checked).length,
    0
  );

  return (
    <div className="flex flex-col px-8 py-6">
      <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Set Up Categories
      </h2>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Review the default categories below. Uncheck any you don&apos;t need, rename them, or add your own.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="max-h-[400px] space-y-3 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-600">
        {categories.map((group, gi) => (
          <div
            key={gi}
            className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800"
          >
            {/* Parent row */}
            <div className="flex items-center gap-2 px-3 py-2">
              <input
                type="checkbox"
                checked={group.checked}
                onChange={() => toggleParent(gi)}
                className="accent-zinc-900 dark:accent-zinc-50"
              />
              {group.editing ? (
                <input
                  autoFocus
                  defaultValue={group.name}
                  onBlur={(e) => finishEditParent(gi, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") finishEditParent(gi, (e.target as HTMLInputElement).value);
                  }}
                  className="flex-1 rounded border border-zinc-300 px-2 py-0.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                />
              ) : (
                <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {group.name}
                </span>
              )}
              <button onClick={() => startEditParent(gi)} className="cursor-pointer p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                {group.editing ? <CheckIcon className="h-3.5 w-3.5" /> : <PencilIcon className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => removeParent(gi)} className="cursor-pointer p-1 text-zinc-400 hover:text-red-500">
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Children */}
            {group.children.length > 0 && (
              <div className="border-t border-zinc-100 px-3 py-1.5 dark:border-zinc-700/50">
                {group.children.map((child, ci) => (
                  <div key={ci} className="flex items-center gap-2 py-1 pl-5">
                    <input
                      type="checkbox"
                      checked={child.checked}
                      onChange={() => toggleChild(gi, ci)}
                      className="accent-zinc-900 dark:accent-zinc-50"
                    />
                    {child.editing ? (
                      <input
                        autoFocus
                        defaultValue={child.name}
                        onBlur={(e) => finishEditChild(gi, ci, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") finishEditChild(gi, ci, (e.target as HTMLInputElement).value);
                        }}
                        className="flex-1 rounded border border-zinc-300 px-2 py-0.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                      />
                    ) : (
                      <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{child.name}</span>
                    )}
                    <button onClick={() => startEditChild(gi, ci)} className="cursor-pointer p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                      {child.editing ? <CheckIcon className="h-3 w-3" /> : <PencilIcon className="h-3 w-3" />}
                    </button>
                    <button onClick={() => removeChild(gi, ci)} className="cursor-pointer p-1 text-zinc-400 hover:text-red-500">
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add child */}
            {addingChildTo === gi ? (
              <div className="flex items-center gap-2 border-t border-zinc-100 px-3 py-2 pl-8 dark:border-zinc-700/50">
                <input
                  autoFocus
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addChild(gi); }}
                  placeholder="Subcategory name"
                  className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                />
                <button onClick={() => addChild(gi)} className="cursor-pointer text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">Add</button>
                <button onClick={() => { setAddingChildTo(null); setNewChildName(""); }} className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-600">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => { setAddingChildTo(gi); setNewChildName(""); }}
                className="flex w-full cursor-pointer items-center gap-1 border-t border-zinc-100 px-3 py-1.5 pl-8 text-xs text-zinc-400 hover:text-zinc-600 dark:border-zinc-700/50 dark:hover:text-zinc-300"
              >
                <PlusIcon className="h-3 w-3" /> Add subcategory
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add new parent */}
      <div className="mt-3 flex items-center gap-2">
        <input
          value={newParentName}
          onChange={(e) => setNewParentName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addParent(); }}
          placeholder="Add a new category..."
          className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
        />
        <button
          onClick={addParent}
          disabled={!newParentName.trim()}
          className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Add
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {selectedCount} categories selected
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={onSkip}
            className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Skip
          </button>
          <button
            onClick={handleAccept}
            disabled={saving}
            className="cursor-pointer rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {saving ? "Creating..." : "Accept & Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
