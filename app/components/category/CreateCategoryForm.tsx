"use client";

import { useState, useRef } from "react";
import { FormField } from "@/app/components/ui/FormField";

interface ParentCategory {
  id: string;
  name: string;
}

interface CreateCategoryFormProps {
  parentCategories: ParentCategory[];
  onSubmit: (name: string, parentId: string | null) => Promise<void>;
}

export function CreateCategoryForm({ parentCategories, onSubmit }: CreateCategoryFormProps) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onSubmit(name.trim(), parentId || null);
      // Keep name and parentId, refocus the name input
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <FormField label="Category Name" className="flex-1">
        <input
          ref={nameInputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Groceries"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
        />
      </FormField>
      <FormField label="Parent (optional)" className="w-48">
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
        >
          <option value="">None (top level)</option>
          {parentCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </FormField>
      <button
        type="submit"
        disabled={loading}
        className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? "Adding..." : "Add"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  );
}
