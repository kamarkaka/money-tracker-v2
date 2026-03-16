"use client";

import { useState, useEffect, useCallback } from "react";

interface CategoryFromApi {
  id: string;
  name: string;
  parentId: string | null;
  children?: CategoryFromApi[];
}

interface BudgetRow {
  name: string;
  amount: string;
  included: boolean;
  categoryIds: string[];
  categoryNames: string[];
}

interface BudgetSetupStepProps {
  onNext: (budgetsCreated: number) => void;
  onSkip: () => void;
}

export function BudgetSetupStep({ onNext, onSkip }: BudgetSetupStepProps) {
  const [buckets, setBuckets] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/category");
      const data: CategoryFromApi[] = await res.json();

      // Build suggested buckets from parent categories
      const parents = data.filter((c) => !c.parentId);
      const suggested: BudgetRow[] = parents.map((parent) => {
        const childIds = (parent.children || []).map((c) => c.id);
        const childNames = (parent.children || []).map((c) => c.name);
        // Include parent itself + children
        return {
          name: parent.name,
          amount: "",
          included: true,
          categoryIds: [parent.id, ...childIds],
          categoryNames: [parent.name, ...childNames],
        };
      });

      setBuckets(suggested);
    } catch {
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleBucket = (idx: number) => {
    setBuckets((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], included: !next[idx].included };
      return next;
    });
  };

  const updateName = (idx: number, name: string) => {
    setBuckets((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], name };
      return next;
    });
  };

  const updateAmount = (idx: number, amount: string) => {
    setBuckets((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], amount };
      return next;
    });
  };

  const handleCreate = async () => {
    const included = buckets.filter((b) => b.included && b.amount && parseFloat(b.amount) > 0);

    if (included.length === 0) {
      onSkip();
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/budget-buckets/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buckets: included.map((b) => ({
            name: b.name,
            amount: parseFloat(b.amount),
            categoryIds: b.categoryIds,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create budgets");
        return;
      }

      const data = await res.json();
      onNext(data.created || included.length);
    } catch {
      setError("Failed to create budgets");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-50" />
      </div>
    );
  }

  if (buckets.length === 0) {
    return (
      <div className="flex flex-col items-center px-8 py-12">
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          No categories found. Create categories first to set up budgets.
        </p>
        <button
          onClick={onSkip}
          className="cursor-pointer rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Continue
        </button>
      </div>
    );
  }

  const includedCount = buckets.filter((b) => b.included && b.amount && parseFloat(b.amount) > 0).length;

  return (
    <div className="flex flex-col px-8 py-6">
      <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Set Up Budgets
      </h2>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Set monthly spending limits for each category group. Leave the amount empty to skip a budget.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="max-h-[400px] space-y-3 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-600">
        {buckets.map((bucket, i) => (
          <div
            key={i}
            className={`rounded-lg border bg-white p-4 transition-opacity dark:bg-zinc-800 ${
              bucket.included
                ? "border-zinc-200 dark:border-zinc-700"
                : "border-zinc-100 opacity-50 dark:border-zinc-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={bucket.included}
                onChange={() => toggleBucket(i)}
                className="accent-zinc-900 dark:accent-zinc-50"
              />
              <input
                type="text"
                value={bucket.name}
                onChange={(e) => updateName(i, e.target.value)}
                className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm font-medium text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              />
              <div className="flex items-center gap-1">
                <span className="text-sm text-zinc-500">$</span>
                <input
                  type="number"
                  value={bucket.amount}
                  onChange={(e) => updateAmount(i, e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={!bucket.included}
                  className="w-24 rounded border border-zinc-300 px-2 py-1 text-right text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                />
                <span className="text-xs text-zinc-400">/ mo</span>
              </div>
            </div>

            {bucket.categoryNames.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1 pl-7">
                {bucket.categoryNames.map((name, ci) => (
                  <span
                    key={ci}
                    className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {includedCount} budget{includedCount !== 1 ? "s" : ""} to create
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={onSkip}
            className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Skip
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="cursor-pointer rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {saving ? "Creating..." : "Create Budgets"}
          </button>
        </div>
      </div>
    </div>
  );
}
