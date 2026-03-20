"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { CreateTagForm } from "@/app/components/tag/CreateTagForm";
import { TagCard } from "@/app/components/tag/TagCard";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";

interface TagWithStats {
  id: string;
  name: string;
  color: string;
  transactionCount: number;
  totalAmount: number;
}

export default function TagPage() {
  const i18n = useTranslations("tag");
  const i18nc = useTranslations("common");
  const [tags, setTags] = useState<TagWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTags = useCallback(async () => {
    const res = await fetch("/api/tags");
    const data = await res.json();
    setTags(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleCreate = async (name: string) => {
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchTags();
  };

  const handleEdit = async (id: string, name: string) => {
    const res = await fetch(`/api/tags/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchTags();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`/api/tags/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    setDeleting(false);
    await fetchTags();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{i18n("title")}</h1>
      </div>

      <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <CreateTagForm onSubmit={handleCreate} />
      </div>

      {tags.length === 0 ? (
        <EmptyState
          title={i18n("noTags")}
          description={i18n("noTagsDesc")}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {tags.map((tag) => (
            <TagCard
              key={tag.id}
              tag={tag}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={i18n("deleteTag")}
        message={i18n("deleteWarning")}
        confirmLabel={i18nc("delete")}
        loading={deleting}
      />
    </div>
  );
}
