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

interface Transaction {
  id: string;
  description: string;
  amount: string | number;
  date: string;
  categoryId: string | null;
  isHidden: boolean;
  isManual: boolean;
  account: { id: string; name: string };
  category: { id: string; name: string; parent?: { id: string; name: string } | null } | null;
  transactionTags?: { tag: { id: string; name: string; color: string } }[];
}

interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface EditTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  transaction: Transaction | null;
  accounts: Account[];
  categories: Category[];
  allTags?: TagItem[];
  onTagsChanged?: () => void;
}

export function EditTransactionModal({
  open,
  onClose,
  onComplete,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  transaction,
  accounts,
  categories,
  allTags = [],
  onTagsChanged,
}: EditTransactionModalProps) {
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isExpense, setIsExpense] = useState(true);
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isHidden, setIsHidden] = useState(false);
  const [createRule, setCreateRule] = useState(true);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<Transaction | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (transaction && open) {
      setAccountId(transaction.account.id);
      setDescription(transaction.description);
      const numAmount = Number(transaction.amount);
      setIsExpense(numAmount < 0);
      setAmount(String(Math.abs(numAmount)));
      setDate(transaction.date.split("T")[0]);
      setCategoryId(transaction.categoryId || "");
      setIsHidden(transaction.isHidden);
      setCreateRule(true);
      setSelectedTagIds(transaction.transactionTags?.map((tt) => tt.tag.id) || []);
      setSavedSnapshot(null);
      setError("");
    }
  }, [transaction, open]);

  const i18n = useTranslations("transaction");
  const i18nc = useTranslations("common");
  const i18nTag = useTranslations("tag");

  if (!transaction) return null;

  const categoryOptions: { id: string; label: string }[] = [];
  for (const parent of categories.filter((c) => !c.parentId)) {
    categoryOptions.push({ id: parent.id, label: parent.name });
    if (parent.children) {
      for (const child of parent.children) {
        categoryOptions.push({ id: child.id, label: `${parent.name} > ${child.name}` });
      }
    }
  }

  const hasChanges = () => {
    if (!transaction) return false;
    const ref = savedSnapshot || transaction;
    const origAmount = Number(ref.amount);
    const newCategoryId = categoryId || null;
    if (newCategoryId !== (ref.categoryId || null)) return true;
    if (isHidden !== ref.isHidden) return true;
    const origTagIds = (ref.transactionTags || []).map((tt) => tt.tag.id).sort().join(",");
    const newTagIds = [...selectedTagIds].sort().join(",");
    if (origTagIds !== newTagIds) return true;
    if (accountId !== ref.account.id) return true;
    if (description.trim() !== ref.description) return true;
    if (date !== ref.date.split("T")[0]) return true;
    const parsedAmount = parseFloat(amount);
    const newAmount = isExpense ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
    if (newAmount !== origAmount) return true;
    return false;
  };

  const handleSubmit = async (mode: "save" | "next") => {
    const changed = hasChanges();
    const wantsRule = createRule && !!categoryId;

    if (!changed && !wantsRule) {
      if (mode === "next" && onNext) onNext();
      return;
    }

    setSaving(true);
    setError("");

    try {
      const body: Record<string, unknown> = {
        categoryId: categoryId || null,
        isHidden,
        tagIds: selectedTagIds,
      };

      {
        if (!accountId) { setError(i18n("accountRequired")); setSaving(false); return; }
        if (!description.trim()) { setError(i18n("descriptionRequired")); setSaving(false); return; }
        if (!date) { setError(i18n("dateRequired")); setSaving(false); return; }
        const parsedAmount = parseFloat(amount);
        if (!amount || isNaN(parsedAmount) || parsedAmount === 0) {
          setError(i18n("amountRequired"));
          setSaving(false);
          return;
        }
        body.accountId = accountId;
        body.description = description.trim();
        body.amount = isExpense ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
        body.date = date;
      }

      if (changed) {
        const res = await fetch(`/api/transaction/${transaction.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || i18nc("error"));
          return;
        }
      }

      // Create a category rule if requested
      if (createRule && categoryId) {
        const desc = description.trim();
        await fetch("/api/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ match: desc, categoryId }),
        });
      }

      // Update snapshot so hasChanges() reflects saved state
      setSavedSnapshot({
        ...transaction,
        categoryId: categoryId || null,
        isHidden,
        description: description.trim(),
        amount: String(isExpense ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount))),
        date: date + "T00:00:00.000Z",
        account: accountId !== transaction.account.id
          ? { id: accountId, name: accounts.find((a) => a.id === accountId)?.name || "" }
          : transaction.account,
        transactionTags: selectedTagIds.map((id) => {
          const tag = allTags.find((t) => t.id === id);
          return { tag: { id, name: tag?.name || "", color: tag?.color || "" } };
        }),
      });
      setCreateRule(false);

      if (changed) onComplete();
      if (mode === "next" && onNext) {
        onNext();
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
    <Modal open={open} onClose={handleClose} title={i18n("editTransaction")} className="w-full max-w-lg">
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

        <div className="flex flex-col gap-2">
          {categoryId && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-create-rule"
                checked={createRule}
                onChange={(e) => setCreateRule(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
              />
              <label htmlFor="edit-create-rule" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {i18n("createRule")}
              </label>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-hidden"
              checked={isHidden}
              onChange={(e) => setIsHidden(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
            />
            <label htmlFor="edit-hidden" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {i18n("hiddenFromReports")}
            </label>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 md:flex-row md:items-center md:gap-3">
          <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:gap-3">
            {onPrev && (
              <button
                type="button"
                onClick={onPrev}
                disabled={!hasPrev || hasChanges()}
                className="cursor-pointer rounded-md border border-card-border px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-accent-subtle hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-300"
              >
                &#8592; {i18nc("prev")}
              </button>
            )}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                disabled={!hasNext || hasChanges()}
                className="cursor-pointer rounded-md border border-card-border px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-accent-subtle hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-300"
              >
                {i18nc("next")} &#8594;
              </button>
            )}
          </div>
          <div className="hidden flex-1 md:block" />
          <div className="flex gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => handleSubmit("save")}
              disabled={saving}
              className="flex-1 cursor-pointer rounded-md bg-accent px-4 py-3 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50 md:flex-none"
            >
              {saving ? i18nc("saving") : i18nc("save")}
            </button>
            {onNext && (
              <button
                type="button"
                onClick={() => handleSubmit("next")}
                disabled={saving}
                className="flex-1 cursor-pointer rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-600 md:flex-none"
              >
                {saving ? i18nc("saving") : i18n("saveAndNext")}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
