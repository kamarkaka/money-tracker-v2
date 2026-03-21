"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon } from "@heroicons/react/24/outline";
import { CreateRuleForm } from "@/app/components/rule/CreateRuleForm";
import { RuleList } from "@/app/components/rule/RuleList";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

interface Rule {
  id: string;
  sequence: number;
  match: string;
  categoryId: string;
  category: { id: string; name: string; parentId: string | null; parent?: { name: string } | null };
}

export default function RulePage() {
  const i18n = useTranslations("rule");
  const i18nc = useTranslations("common");
  const [rules, setRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const [rulesRes, catRes] = await Promise.all([
      fetch("/api/rules"),
      fetch("/api/category"),
    ]);
    const [rulesData, catData] = await Promise.all([rulesRes.json(), catRes.json()]);
    setRules(rulesData);
    setCategories(catData);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const allFlatCategories = categories
    .filter((c) => !c.parentId)
    .flatMap((c) => [
      { id: c.id, name: c.name },
      ...(c.children?.map((ch) => ({ id: ch.id, name: `${c.name} > ${ch.name}` })) ?? []),
    ]);

  const handleCreate = async (match: string, categoryId: string) => {
    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match, categoryId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchData();
  };

  const handleUpdate = async (id: string, match: string, categoryId: string) => {
    const res = await fetch(`/api/rules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match, categoryId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchData();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`/api/rules/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    setDeleting(false);
    await fetchData();
  };

  const handleReorder = async (ruleIds: string[]) => {
    await fetch("/api/rules/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleIds }),
    });
    await fetchData();
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

      <div className="sticky top-0 z-30 mb-4 max-h-[70vh] overflow-hidden overflow-y-auto rounded-lg border border-card-border bg-gradient-to-r from-orange-50 to-white shadow-sm dark:from-orange-950 dark:to-zinc-900 md:top-16">
        <button
          onClick={() => setFormOpen(!formOpen)}
          className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left"
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white"
            style={{ transition: "transform 0.3s ease", transform: formOpen ? "rotate(45deg)" : "rotate(0deg)" }}
          >
            <PlusIcon className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {i18n("addRule")}
          </span>
        </button>
        {formOpen && (
          <div className="border-t border-card-border px-5 pb-5 pt-4">
            <CreateRuleForm categories={allFlatCategories} onSubmit={handleCreate} />
          </div>
        )}
      </div>

      {rules.length === 0 ? (
        <EmptyState
          title={i18n("noRules")}
          description={i18n("noRulesDesc")}
        />
      ) : (
        <RuleList
          rules={rules}
          categories={allFlatCategories}
          onUpdate={handleUpdate}
          onDelete={(id) => setDeleteId(id)}
          onReorder={handleReorder}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={i18n("deleteRule")}
        message={i18n("deleteWarning")}
        confirmLabel={i18nc("delete")}
        loading={deleting}
      />
    </div>
  );
}
