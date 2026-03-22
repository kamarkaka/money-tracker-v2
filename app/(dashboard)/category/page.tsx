"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon } from "@heroicons/react/24/outline";
import { ProOnly } from "@/app/components/ProOnly";
import { CategoryTree } from "@/app/components/category/CategoryTree";
import { CreateCategoryForm } from "@/app/components/category/CreateCategoryForm";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

export default function CategoryPage() {
  const i18n = useTranslations("category");
  const i18nc = useTranslations("common");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/category");
    const data = await res.json();
    setCategories(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreate = async (name: string, parentId: string | null) => {
    const res = await fetch("/api/category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchCategories();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`/api/category/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    setDeleting(false);
    await fetchCategories();
  };

  const parentCategories = categories.filter((c) => !c.parentId);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <ProOnly>
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{i18n("title")}</h1>
      </div>

      <div className="sticky top-0 z-30 mb-4 max-h-[70vh] overflow-hidden overflow-y-auto rounded-lg border border-card-border bg-gradient-to-r from-purple-50 to-white shadow-sm dark:from-purple-950 dark:to-zinc-900 md:top-16">
        <button
          onClick={() => setFormOpen(!formOpen)}
          className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left"
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white"
            style={{ transition: "transform 0.3s ease", transform: formOpen ? "rotate(45deg)" : "rotate(0deg)" }}
          >
            <PlusIcon className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {i18n("addCategory")}
          </span>
        </button>
        {formOpen && (
          <div className="border-t border-card-border px-5 pb-5 pt-4">
            <CreateCategoryForm parentCategories={parentCategories} onSubmit={handleCreate} />
          </div>
        )}
      </div>

      {categories.length === 0 ? (
        <div className="rounded-lg border border-card-border bg-card-bg">
          <EmptyState
            title={i18n("title")}
            description={i18n("addCategory")}
          />
        </div>
      ) : (
        <CategoryTree
          categories={categories}
          onDelete={(id) => setDeleteId(id)}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={i18n("deleteCategory")}
        message={i18n("deleteWarning")}
        loading={deleting}
      />
    </div>
    </ProOnly>
  );
}
