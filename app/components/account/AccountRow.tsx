"use client";

import { useState } from "react";
import { Badge } from "@/app/components/ui/Badge";
import { CurrencyDisplay } from "@/app/components/ui/CurrencyDisplay";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { EditableName } from "./EditableName";

interface AccountRowProps {
  account: {
    id: string;
    name: string;
    type: string;
    balance: string | number;
    currency: string;
  };
  onHidden?: () => void;
}

const TYPE_VARIANTS: Record<string, "default" | "success" | "warning" | "info"> = {
  checking: "info",
  savings: "success",
  credit_card: "warning",
  investment: "default",
};

export function AccountRow({ account, onHidden }: AccountRowProps) {
  const [name, setName] = useState(account.name);
  const [hiding, setHiding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRename = async (newName: string) => {
    const res = await fetch(`/api/account/${account.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setName(newName);
    }
  };

  const handleHide = async () => {
    setHiding(true);
    const res = await fetch(`/api/account/${account.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden: true }),
    });
    if (res.ok) {
      onHidden?.();
    }
    setHiding(false);
    setShowConfirm(false);
  };

  const isLiability = account.type.toLowerCase() === "credit_card" || account.type.toLowerCase() === "loan";
  const rawBalance = typeof account.balance === "string" ? parseFloat(account.balance) : account.balance;
  const displayBalance = isLiability ? -Math.abs(rawBalance) : Math.abs(rawBalance);

  return (
    <div className="group flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <EditableName
          value={name}
          onSave={handleRename}
          className="text-sm text-zinc-900 dark:text-zinc-100"
        />
        <Badge variant={TYPE_VARIANTS[account.type] ?? "default"}>
          {account.type.replace("_", " ")}
        </Badge>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={hiding}
          className="cursor-pointer rounded px-2 py-1 text-xs text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          Hide
        </button>
      </div>
      <CurrencyDisplay amount={displayBalance} currency={account.currency} />
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleHide}
        title="Hide Account"
        message={`Hide "${name}"? It will no longer appear in your accounts or transactions.`}
        confirmLabel={hiding ? "Hiding..." : "Hide"}
        loading={hiding}
      />
    </div>
  );
}
