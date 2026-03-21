"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/app/components/ui/FormField";

interface Category {
  id: string;
  name: string;
}

interface CreateRuleFormProps {
  categories: Category[];
  onSubmit: (match: string, categoryId: string) => Promise<void>;
}

export function CreateRuleForm({ categories, onSubmit }: CreateRuleFormProps) {
  const i18n = useTranslations("rule");
  const i18nc = useTranslations("common");
  const [match, setMatch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const matchInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match.trim() || !categoryId) return;
    setLoading(true);
    setError("");
    try {
      await onSubmit(match.trim(), categoryId);
      setMatch("");
      matchInputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : i18nc("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row md:items-end">
        <FormField label={i18n("matchString")} className="flex-1">
          <input
            ref={matchInputRef}
            type="text"
            value={match}
            onChange={(e) => setMatch(e.target.value)}
            placeholder={i18n("matchPlaceholder")}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
          />
        </FormField>
        <FormField label={i18n("targetCategory")} className="w-full md:w-64">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
          >
            <option value="">{i18n("selectCategory")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </FormField>
        <button
          type="submit"
          disabled={loading}
          className="w-full cursor-pointer rounded-md bg-accent px-4 py-3 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50 md:w-auto md:py-2"
        >
          {loading ? i18nc("adding") : i18n("addRule")}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
