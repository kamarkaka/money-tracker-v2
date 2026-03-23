"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/app/components/ui/FormField";

interface CreateTagFormProps {
  onSubmit: (name: string) => Promise<void>;
}

export function CreateTagForm({ onSubmit }: CreateTagFormProps) {
  const i18n = useTranslations("tag");
  const i18nc = useTranslations("common");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onSubmit(name.trim());
      setName("");
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : i18nc("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row md:items-end">
        <FormField label={i18n("tagName")} className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={i18n("namePlaceholder")}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
          />
        </FormField>
        <button
          type="submit"
          disabled={loading}
          className="w-full cursor-pointer rounded-md bg-accent px-4 py-3 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50 md:w-auto md:py-2"
        >
          {loading ? i18nc("adding") : i18n("addTag")}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
