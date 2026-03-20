"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
    isHidden?: boolean;
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
  const i18n = useTranslations("account");
  const [name, setName] = useState(account.name);
  const [hidden, setHidden] = useState(account.isHidden ?? false);
  const [toggling, setToggling] = useState(false);
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

  const handleToggleHidden = async () => {
    setToggling(true);
    const newHidden = !hidden;
    const res = await fetch(`/api/account/${account.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden: newHidden }),
    });
    if (res.ok) {
      setHidden(newHidden);
      onHidden?.();
    }
    setToggling(false);
    setShowConfirm(false);
  };

  const handleHideClick = () => {
    if (hidden) {
      // Unhide directly, no confirmation needed
      handleToggleHidden();
    } else {
      setShowConfirm(true);
    }
  };

  const isLiability = account.type.toLowerCase() === "credit_card" || account.type.toLowerCase() === "loan";
  const rawBalance = typeof account.balance === "string" ? parseFloat(account.balance) : account.balance;
  const displayBalance = isLiability ? -Math.abs(rawBalance) : rawBalance;

  return (
    <div className="group flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <EditableName
          value={name}
          onSave={handleRename}
          className={`text-sm ${hidden ? "line-through text-zinc-400 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}
        />
        <span className="hidden md:inline">
          <Badge variant={TYPE_VARIANTS[account.type] ?? "default"}>
            {account.type.replace("_", " ")}
          </Badge>
        </span>
        <button
          onClick={handleHideClick}
          disabled={toggling}
          className="cursor-pointer rounded px-2 py-1 text-xs text-zinc-400 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          {hidden ? i18n("unhide") : i18n("hide")}
        </button>
      </div>
      <CurrencyDisplay amount={displayBalance} currency={account.currency} />
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleToggleHidden}
        title={i18n("hide")}
        message={`${name} — all transactions from this account will also be hidden from overview.`}
        confirmLabel={toggling ? "..." : i18n("hide")}
        loading={toggling}
      />
    </div>
  );
}
