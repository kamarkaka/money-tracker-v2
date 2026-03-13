"use client";

import { useState, useEffect, useCallback } from "react";
import { CategoryTree } from "@/app/components/category/CategoryTree";
import { CreateCategoryForm } from "@/app/components/category/CreateCategoryForm";
import { EditCategoryModal } from "@/app/components/category/EditCategoryModal";
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleEdit = async (id: string, name: string, parentId: string | null) => {
    const res = await fetch(`/api/category/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    setEditCategory(null);
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Categories</h1>
      </div>

      <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Add New Category
        </h2>
        <CreateCategoryForm parentCategories={parentCategories} onSubmit={handleCreate} />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Create your first category above to get started."
          />
        ) : (
          <CategoryTree
            categories={categories}
            onEdit={(cat) => setEditCategory(cat)}
            onDelete={(id) => setDeleteId(id)}
          />
        )}
      </div>

      <EditCategoryModal
        open={!!editCategory}
        onClose={() => setEditCategory(null)}
        category={editCategory}
        parentCategories={parentCategories}
        onSubmit={handleEdit}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? Transactions assigned to it will become uncategorized."
        loading={deleting}
      />
    </div>
  );
}
