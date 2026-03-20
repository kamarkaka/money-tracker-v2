"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
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

      <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {i18n("addRule")}
        </h2>
        <CreateRuleForm categories={allFlatCategories} onSubmit={handleCreate} />
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
