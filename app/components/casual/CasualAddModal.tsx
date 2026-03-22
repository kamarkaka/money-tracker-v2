"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, CalendarIcon, TrashIcon } from "@heroicons/react/24/outline";
import { CurrencyInput } from "@/app/components/ui/CurrencyInput";
import { DEFAULT_EMOJIS, EMOJI_TO_NAME } from "@/app/lib/emoji-categories";

interface Transaction {
  id?: string;
  description?: string;
  amount?: string | number;
  date?: string;
  category: { emoji?: string | null } | null;
}

interface CasualAddModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  accountId: string;
  transactions: Transaction[];
  editTransaction?: Transaction | null;
}

export function CasualAddModal({ open, onClose, onComplete, accountId, transactions, editTransaction }: CasualAddModalProps) {
  const i18n = useTranslations("transaction");
  const i18nc = useTranslations("common");

  const isEdit = !!editTransaction;

  const [selectedEmoji, setSelectedEmoji] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isExpense, setIsExpense] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [customEmoji, setCustomEmoji] = useState("");
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Populate form when editing
  useEffect(() => {
    if (editTransaction && open) {
      const amt = Number(editTransaction.amount);
      setSelectedEmoji(editTransaction.category?.emoji || "");
      setCustomEmoji("");
      setAmount(String(Math.abs(amt)));
      setDescription(editTransaction.description || "");
      setDate((editTransaction.date || "").split("T")[0] || new Date().toISOString().split("T")[0]);
      setIsExpense(amt < 0);
      setError("");
      setShowEmojiPicker(false);
    } else if (!editTransaction && open) {
      // Reset for add mode
      setSelectedEmoji("");
      setCustomEmoji("");
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setIsExpense(true);
      setError("");
      setShowEmojiPicker(false);
    }
  }, [editTransaction, open]);

  // Build recent emojis from transactions
  const recentEmojis: string[] = [];
  const seenEmojis = new Set<string>();
  for (const t of transactions) {
    const e = t.category?.emoji;
    if (e && !seenEmojis.has(e)) {
      seenEmojis.add(e);
      recentEmojis.push(e);
    }
    if (recentEmojis.length >= 8) break;
  }

  const handleSubmit = async () => {
    const emoji = selectedEmoji || customEmoji;
    if (!emoji || !amount) {
      setError(i18n("amountRequired"));
      return;
    }
    if (!accountId) return;

    setSaving(true);
    setError("");

    const parsedAmount = parseFloat(amount);
    const finalAmount = isExpense ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);

    if (isEdit && editTransaction?.id) {
      // Update existing
      const res = await fetch(`/api/transaction/${editTransaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim() || "",
          amount: finalAmount,
          date,
          emoji,
        }),
      });
      setSaving(false);
      if (res.ok) {
        onComplete();
        onClose();
      }
    } else {
      // Create new
      const res = await fetch("/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          description: description.trim() || undefined,
          amount: finalAmount,
          date,
          emoji,
        }),
      });
      setSaving(false);
      if (res.ok) {
        setAmount("");
        setDescription("");
        setSelectedEmoji(emoji);
        setCustomEmoji("");
        setDate(new Date().toISOString().split("T")[0]);
        onComplete();
        onClose();
      }
    }
  };

  const handleDelete = async () => {
    if (!editTransaction?.id) return;
    setSaving(true);
    await fetch(`/api/transaction/${editTransaction.id}`, { method: "DELETE" });
    setSaving(false);
    onComplete();
    onClose();
  };

  const handleClose = () => {
    setShowEmojiPicker(false);
    setError("");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={handleClose}>
      <div className="mb-24 w-full max-w-lg rounded-2xl border border-card-border bg-card-bg px-6 pb-6 pt-5 shadow-xl md:mb-0" onClick={(e) => e.stopPropagation()}>
        {/* Date — text style with calendar icon */}
        <div className="mb-5 flex items-center justify-center gap-2">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </span>
          <div className="relative cursor-pointer rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-accent dark:hover:bg-zinc-800">
            <CalendarIcon className="h-5 w-5" />
            <input
              ref={dateInputRef}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </div>
        </div>

        {/* Emoji category selector — big round button */}
        <div className="relative mb-5 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`flex h-20 w-20 cursor-pointer items-center justify-center rounded-full transition-colors ${
              selectedEmoji || customEmoji
                ? "bg-accent-subtle"
                : "border-2 border-dashed border-zinc-300 dark:border-zinc-600"
            }`}
          >
            {selectedEmoji || customEmoji ? (
              <span className="text-4xl">{selectedEmoji || customEmoji}</span>
            ) : (
              <PlusIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
            )}
          </button>
          {(selectedEmoji || customEmoji) && (
            <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {EMOJI_TO_NAME[selectedEmoji || customEmoji] || "Custom"}
            </span>
          )}

          {/* Quick recent emojis */}
          {recentEmojis.length > 0 && !showEmojiPicker && !isEdit && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {recentEmojis.slice(0, 8).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { setSelectedEmoji(e); setCustomEmoji(""); }}
                  className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-colors ${
                    selectedEmoji === e
                      ? "bg-accent text-accent-text"
                      : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  }`}
                >
                  <span className="text-xl">{e}</span>
                </button>
              ))}
            </div>
          )}

          {/* Emoji picker popup */}
          {showEmojiPicker && (
            <div className="absolute top-full z-10 mt-2 w-full max-w-sm rounded-xl border border-card-border bg-card-bg p-3 shadow-lg">
              {recentEmojis.length > 0 && (
                <>
                  <p className="mb-2 text-xs font-medium text-zinc-400 dark:text-zinc-500">Recent</p>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {recentEmojis.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => { setSelectedEmoji(e); setCustomEmoji(""); setShowEmojiPicker(false); }}
                        className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                          selectedEmoji === e ? "bg-accent text-accent-text" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <span className="text-2xl">{e}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mb-2 border-t border-card-border" />
                </>
              )}

              <div className="mb-2 grid grid-cols-5 gap-1.5">
                {DEFAULT_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => { setSelectedEmoji(e); setCustomEmoji(""); setShowEmojiPicker(false); }}
                    className={`flex h-11 w-11 cursor-pointer flex-col items-center justify-center rounded-lg transition-colors ${
                      selectedEmoji === e ? "bg-accent text-accent-text" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span className="text-xl">{e}</span>
                    <span className={`text-[8px] leading-tight ${selectedEmoji === e ? "text-accent-text" : "text-zinc-400 dark:text-zinc-500"}`}>
                      {(EMOJI_TO_NAME[e] || "").split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="border-t border-card-border pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customEmoji}
                    onChange={(e) => setCustomEmoji(e.target.value.slice(-2))}
                    placeholder="Type emoji..."
                    className="h-9 flex-1 rounded-md border border-card-border bg-input-bg px-3 text-center text-lg outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customEmoji) {
                        setSelectedEmoji("");
                        setShowEmojiPicker(false);
                      }
                    }}
                    disabled={!customEmoji}
                    className="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Expense / Income pill toggle */}
        <div className="mb-5 flex justify-center">
          <div className="inline-flex overflow-hidden rounded-full border border-card-border">
            <button
              type="button"
              onClick={() => setIsExpense(true)}
              className={`cursor-pointer px-5 py-2 text-sm font-medium transition-colors ${
                isExpense
                  ? "bg-red-500 text-white"
                  : "bg-card-bg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {i18n("expense")}
            </button>
            <button
              type="button"
              onClick={() => setIsExpense(false)}
              className={`cursor-pointer px-5 py-2 text-sm font-medium transition-colors ${
                !isExpense
                  ? "bg-emerald-500 text-white"
                  : "bg-card-bg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {i18n("income")}
            </button>
          </div>
        </div>

        {/* Big amount input */}
        <div className="mb-5 py-4">
          <CurrencyInput
            value={amount}
            onChange={setAmount}
            placeholder="$0"
            className="text-override w-full border-0 bg-transparent text-center text-7xl font-extrabold text-zinc-900 outline-none placeholder-zinc-200 dark:text-zinc-50 dark:placeholder-zinc-700"
          />
        </div>

        {/* Optional note */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={i18n("descriptionOptional")}
          rows={2}
          className="mb-5 w-full resize-none rounded-lg border border-card-border bg-input-bg px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:text-zinc-50 dark:placeholder-zinc-500"
        />

        {error && <p className="mb-3 text-center text-sm text-red-500">{error}</p>}

        {/* Action buttons */}
        <div className="flex gap-3">
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:hover:bg-red-900/50"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving || (!selectedEmoji && !customEmoji) || !amount}
            className="h-12 w-full cursor-pointer rounded-full bg-emerald-500 text-base font-semibold text-white shadow-md hover:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? i18nc("saving") : isEdit ? i18nc("save") : i18n("addTransaction")}
          </button>
        </div>
      </div>
    </div>
  );
}
