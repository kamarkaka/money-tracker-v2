"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { TagBadge } from "./TagBadge";
import { CurrencyDisplay } from "@/app/components/ui/CurrencyDisplay";
import { formatDate } from "@/app/lib/utils";

interface Transaction {
  id: string;
  description: string;
  amount: string | number;
  date: string;
  account: { id: string; name: string };
  category: { id: string; name: string } | null;
}

interface TagCardProps {
  tag: { id: string; name: string; color: string; transactionCount: number; totalAmount: number };
  onEdit: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => void;
}

export function TagCard({ tag, onEdit, onDelete }: TagCardProps) {
  const i18n = useTranslations("tag");
  const i18nc = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(tag.name);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(tag.transactionCount > 0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [fetched, setFetched] = useState(false);

  const handleSave = async () => {
    if (!editName.trim() || editName.trim() === tag.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onEdit(tag.id, editName.trim());
      setEditing(false);
    } catch {
      // error handled upstream
    } finally {
      setSaving(false);
    }
  };

  const fetchTransactions = async () => {
    if (fetched) return;
    setLoadingTxns(true);
    const res = await fetch(`/api/tags/${tag.id}/transactions`);
    const data = await res.json();
    setTransactions(data);
    setFetched(true);
    setLoadingTxns(false);
  };

  useEffect(() => {
    if (tag.transactionCount > 0) {
      fetchTransactions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag.id]);

  const toggleExpand = () => {
    if (!fetched) fetchTransactions();
    setExpanded(!expanded);
  };

  return (
    <div className="rounded-lg border border-card-border bg-card-bg">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
                className="rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-900 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="cursor-pointer rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
              >
                {saving ? i18nc("saving") : i18nc("save")}
              </button>
              <button
                onClick={() => { setEditing(false); setEditName(tag.name); }}
                className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                {i18nc("cancel")}
              </button>
            </div>
          ) : (
            <>
              <TagBadge name={tag.name} color={tag.color} />
              {tag.transactionCount > 0 && (
                <button
                  onClick={toggleExpand}
                  className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  {i18n("transactions", { count: tag.transactionCount })}
                  <span className="ml-1">
                    (<CurrencyDisplay amount={tag.totalAmount} />)
                  </span>
                </button>
              )}
            </>
          )}
        </div>
        {!editing && (
          <div className="flex gap-1">
            <button
              onClick={() => { setEditName(tag.name); setEditing(true); }}
              className="cursor-pointer rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              title={i18nc("edit")}
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(tag.id)}
              className="cursor-pointer rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
              title={i18nc("delete")}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      {expanded && tag.transactionCount > 0 && (
        <div className="border-t border-zinc-200 dark:border-zinc-700">
          {loadingTxns ? (
            <div className="px-5 py-3 text-sm text-zinc-500 dark:text-zinc-400">{i18nc("loading")}</div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center gap-2 px-5 py-2.5 text-sm">
                  <span className="w-16 shrink-0 md:w-20 text-zinc-500 dark:text-zinc-400">{formatDate(t.date)}</span>
                  <span className="min-w-0 flex-1 truncate text-zinc-700 dark:text-zinc-300">{t.description}</span>
                  <span className="hidden md:inline w-28 shrink-0 truncate text-xs text-zinc-400 dark:text-zinc-500">{t.account.name}</span>
                  <span className="w-20 shrink-0 md:w-24 text-right">
                    <CurrencyDisplay amount={t.amount} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
