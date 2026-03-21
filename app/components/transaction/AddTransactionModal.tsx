"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/app/components/ui/Modal";
import { TagSelector } from "@/app/components/tag/TagSelector";

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  accounts: Account[];
  categories: Category[];
  allTags?: TagItem[];
  onTagsChanged?: () => void;
}

export function AddTransactionModal({
  open,
  onClose,
  onComplete,
  accounts,
  categories,
  allTags = [],
  onTagsChanged,
}: AddTransactionModalProps) {
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isExpense, setIsExpense] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [categoryId, setCategoryId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setAccountId("");
      setDescription("");
      setAmount("");
      setIsExpense(true);
      setDate(new Date().toISOString().split("T")[0]);
      setCategoryId("");
      setSelectedTagIds([]);
      setError("");
    }
  }, [open]);

  const i18n = useTranslations("transaction");
  const i18nc = useTranslations("common");
  const i18nTag = useTranslations("tag");

  // Build flat category options with "Parent > Child" format
  const categoryOptions: { id: string; label: string }[] = [];
  for (const parent of categories.filter((c) => !c.parentId)) {
    categoryOptions.push({ id: parent.id, label: parent.name });
    if (parent.children) {
      for (const child of parent.children) {
        categoryOptions.push({ id: child.id, label: `${parent.name} > ${child.name}` });
      }
    }
  }

  const handleSubmit = async (mode: "close" | "next") => {
    if (!accountId) { setError(i18n("accountRequired")); return; }
    if (!description.trim()) { setError(i18n("descriptionRequired")); return; }
    if (!date) { setError(i18n("dateRequired")); return; }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount === 0) {
      setError(i18n("amountRequired"));
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          description: description.trim(),
          amount: isExpense ? -Math.abs(parsedAmount) : Math.abs(parsedAmount),
          date,
          categoryId: categoryId || null,
          tagIds: selectedTagIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || i18nc("error"));
        return;
      }

      onComplete();

      if (mode === "next") {
        setAmount("");
      } else {
        onClose();
      }
    } catch {
      setError(i18nc("error"));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setError("");
    onClose();
  };

  const inputClass =
    "w-full h-10 rounded-md border border-card-border px-3 py-2 text-sm text-zinc-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent bg-input-bg dark:text-zinc-50";

  return (
    <Modal open={open} onClose={handleClose} title={i18n("addTransaction")} className="w-full max-w-lg">
      <div className="flex flex-col gap-4">
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <div className="w-2/5">
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{i18n("date")}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${inputClass} appearance-none`}
            />
          </div>
          <div className="w-3/5">
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{i18n("account")}</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
              <option value="">{i18n("selectAccount")}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{i18n("description")}</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder=""
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{i18n("amount")}</label>
          <div className="flex gap-3">
            <div className="flex w-2/5 shrink-0 overflow-hidden rounded-md border border-card-border">
              <button
                type="button"
                onClick={() => setIsExpense(true)}
                className={`flex-1 cursor-pointer px-2 py-2 text-sm font-medium ${
                  isExpense
                    ? "bg-red-500 text-white"
                    : "bg-input-bg text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300"
                }`}
              >
                {i18n("expense")}
              </button>
              <button
                type="button"
                onClick={() => setIsExpense(false)}
                className={`flex-1 cursor-pointer px-2 py-2 text-sm font-medium ${
                  !isExpense
                    ? "bg-green-500 text-white"
                    : "bg-input-bg text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300"
                }`}
              >
                {i18n("income")}
              </button>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {i18n("categoryOptional")}
          </label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
            <option value="">{i18n("none")}</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        {allTags.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {i18nTag("tags")}
            </label>
            <TagSelector
              allTags={allTags}
              selectedTagIds={selectedTagIds}
              onChange={setSelectedTagIds}
              onCreateTag={async (name) => {
                const res = await fetch("/api/tags", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name }),
                });
                if (!res.ok) return null;
                const tag = await res.json();
                onTagsChanged?.();
                return tag;
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={() => handleSubmit("close")}
            disabled={saving}
            className="cursor-pointer rounded-md bg-accent px-4 py-3 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? i18nc("adding") : i18n("addAndClose")}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("next")}
            disabled={saving}
            className="cursor-pointer rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-600"
          >
            {saving ? i18nc("adding") : i18n("addAndNext")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
