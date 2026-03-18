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

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  accounts: Account[];
  categories: Category[];
}

export function AddTransactionModal({
  open,
  onClose,
  onComplete,
  accounts,
  categories,
}: AddTransactionModalProps) {
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isExpense, setIsExpense] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [categoryId, setCategoryId] = useState("");
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
      setError("");
    }
  }, [open]);

  const i18n = useTranslations("transaction");
  const i18nc = useTranslations("common");

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
    "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50";

  return (
    <Modal open={open} onClose={handleClose} title={i18n("addTransaction")} className="w-full max-w-md">
      <div className="flex flex-col gap-4">
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{i18n("account")}</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
            <option value="">{i18n("selectAccount")}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
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
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{i18n("date")}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
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
            {saving ? i18nc("adding") : i18n("addAndClose")}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("next")}
            disabled={saving}
            className="cursor-pointer rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-600"
          >
            {saving ? i18nc("adding") : i18n("addAndNext")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
