"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/app/components/ui/Modal";

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
}: EditTransactionModalProps) {
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isExpense, setIsExpense] = useState(true);
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isHidden, setIsHidden] = useState(false);
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
      setError("");
    }
  }, [transaction, open]);

  const i18n = useTranslations("transaction");
  const i18nc = useTranslations("common");

  if (!transaction) return null;

  const isManual = transaction.isManual;

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
    const origAmount = Number(transaction.amount);
    const newCategoryId = categoryId || null;
    if (newCategoryId !== (transaction.categoryId || null)) return true;
    if (isHidden !== transaction.isHidden) return true;
    if (isManual) {
      if (accountId !== transaction.account.id) return true;
      if (description.trim() !== transaction.description) return true;
      if (date !== transaction.date.split("T")[0]) return true;
      const parsedAmount = parseFloat(amount);
      const newAmount = isExpense ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
      if (newAmount !== origAmount) return true;
    }
    return false;
  };

  const handleSubmit = async (mode: "close" | "next") => {
    const changed = hasChanges();

    if (!changed) {
      if (mode === "next" && onNext) {
        onNext();
      } else {
        onClose();
      }
      return;
    }

    setSaving(true);
    setError("");

    try {
      const body: Record<string, unknown> = {
        categoryId: categoryId || null,
        isHidden,
      };

      if (isManual) {
        if (!accountId || !description.trim() || !amount || !date) {
          setError(i18nc("error"));
          setSaving(false);
          return;
        }
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount === 0) {
          setError(i18nc("error"));
          setSaving(false);
          return;
        }
        body.accountId = accountId;
        body.description = description.trim();
        body.amount = isExpense ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
        body.date = date;
      }

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

      onComplete();
      if (mode === "next" && onNext) {
        onNext();
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
    "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50";
  const disabledInputClass =
    "w-full rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-500";

  return (
    <Modal open={open} onClose={handleClose} title={i18n("editTransaction")} className="w-full max-w-md">
      <div className="flex flex-col gap-4">
        {(onPrev || onNext) && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              &#8592; {i18nc("prev")}
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {i18nc("next")} &#8594;
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {!isManual && (
          <div className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {i18n("bankSyncedNote")}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{i18n("account")}</label>
          {isManual ? (
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
              <option value="">{i18n("selectAccount")}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          ) : (
            <input type="text" value={transaction.account.name} disabled className={disabledInputClass} />
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{i18n("description")}</label>
          {isManual ? (
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          ) : (
            <input type="text" value={transaction.description} disabled className={disabledInputClass} />
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{i18n("amount")}</label>
          {isManual ? (
            <div className="flex gap-2">
              <div className="flex rounded-md border border-zinc-300 dark:border-zinc-600">
                <button
                  type="button"
                  onClick={() => setIsExpense(true)}
                  className={`cursor-pointer rounded-l-md px-3 py-2 text-sm font-medium ${
                    isExpense
                      ? "bg-red-500 text-white"
                      : "bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {i18n("expense")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpense(false)}
                  className={`cursor-pointer rounded-r-md px-3 py-2 text-sm font-medium ${
                    !isExpense
                      ? "bg-green-500 text-white"
                      : "bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300"
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
          ) : (
            <input type="text" value={`$${Math.abs(Number(transaction.amount)).toFixed(2)}`} disabled className={disabledInputClass} />
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{i18n("date")}</label>
          {isManual ? (
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          ) : (
            <input type="text" value={transaction.date.split("T")[0]} disabled className={disabledInputClass} />
          )}
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

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {i18nc("cancel")}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("close")}
            disabled={saving}
            className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {saving ? i18nc("saving") : i18n("saveAndClose")}
          </button>
          {onNext && (
            <button
              type="button"
              onClick={() => handleSubmit("next")}
              disabled={saving}
              className="cursor-pointer rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-600"
            >
              {saving ? i18nc("saving") : i18n("saveAndNext")}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
