"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon } from "@heroicons/react/24/outline";
import { ProOnly } from "@/app/components/ProOnly";
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
  const [formOpen, setFormOpen] = useState(false);

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
    <ProOnly>
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{i18n("title")}</h1>
      </div>

      <div className="sticky top-0 z-30 mb-4 max-h-[70vh] overflow-hidden overflow-y-auto rounded-lg border border-card-border bg-gradient-to-r from-teal-50 to-white shadow-sm dark:from-teal-950 dark:to-zinc-900 md:top-16">
        <button
          onClick={() => setFormOpen(!formOpen)}
          className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left"
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white"
            style={{ transition: "transform 0.3s ease", transform: formOpen ? "rotate(45deg)" : "rotate(0deg)" }}
          >
            <PlusIcon className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {i18n("addTag")}
          </span>
        </button>
        {formOpen && (
          <div className="border-t border-card-border px-5 pb-5 pt-4">
            <CreateTagForm onSubmit={handleCreate} />
          </div>
        )}
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
    </ProOnly>
  );
}
