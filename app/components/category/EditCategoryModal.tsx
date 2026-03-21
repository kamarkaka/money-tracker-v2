"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/app/components/ui/Modal";
import { FormField } from "@/app/components/ui/FormField";

interface ParentCategory {
  id: string;
  name: string;
}

interface EditCategoryModalProps {
  open: boolean;
  onClose: () => void;
  category: { id: string; name: string; parentId: string | null } | null;
  parentCategories: ParentCategory[];
  onSubmit: (id: string, name: string, parentId: string | null) => Promise<void>;
}

export function EditCategoryModal({
  open,
  onClose,
  category,
  parentCategories,
  onSubmit,
}: EditCategoryModalProps) {
  const i18n = useTranslations("category");
  const i18nc = useTranslations("common");
  const [name, setName] = useState(category?.name ?? "");
  const [parentId, setParentId] = useState(category?.parentId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (category && open) {
      setName(category.name);
      setParentId(category.parentId ?? "");
      setError("");
    }
  }, [category, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !name.trim()) return;

    const nameUnchanged = name.trim() === category.name;
    const parentUnchanged = (parentId || null) === (category.parentId || null);
    if (nameUnchanged && parentUnchanged) {
      onClose();
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onSubmit(category.id, name.trim(), parentId || null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : i18nc("error"));
    } finally {
      setLoading(false);
    }
  };

  // Filter out the current category from parent options (can't be its own parent)
  const availableParents = parentCategories.filter((p) => p.id !== category?.id);

  return (
    <Modal open={open} onClose={onClose} title={i18n("editCategory")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={i18nc("name")}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
          />
        </FormField>
        <FormField label={i18n("parentOptional")}>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
          >
            <option value="">{i18n("noneTopLevel")}</option>
            {availableParents.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </FormField>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {i18nc("cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? i18nc("saving") : i18nc("save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
