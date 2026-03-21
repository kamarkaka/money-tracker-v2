"use client";

import { useState } from "react";
import { TrashIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { AccountRow } from "./AccountRow";
import { EditableName } from "./EditableName";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: string | number;
  currency: string;
  isHidden?: boolean;
}

interface InstitutionCardProps {
  institution: {
    id: string;
    name: string;
    isManual?: boolean;
    updatedAt: string;
    accounts: Account[];
  };
  onRemove: (id: string) => void;
  onRefresh: (institutionId: string) => void;
  onAccountHidden?: () => void;
  refreshing?: boolean;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
}

export function InstitutionCard({ institution, onRemove, onRefresh, onAccountHidden, refreshing }: InstitutionCardProps) {
  const [name, setName] = useState(institution.name);

  const handleRename = async (newName: string) => {
    const res = await fetch(`/api/institution/${institution.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setName(newName);
    }
  };

  return (
    <div className="card-hover rounded-lg border border-card-border bg-card-bg">
      <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
        <EditableName
          value={name}
          onSave={handleRename}
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        />
        <div className="flex items-center gap-2">
          {institution.isManual && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              Manual
            </span>
          )}
          <span className="hidden text-xs text-zinc-400 dark:text-zinc-500 md:inline">
            {formatRelativeTime(institution.updatedAt)}
          </span>
          {!institution.isManual && (
            <button
              onClick={() => onRefresh(institution.id)}
              disabled={refreshing}
              className="cursor-pointer rounded-md border border-zinc-300 p-2 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 md:p-1.5"
              title="Refresh institution"
            >
              <ArrowPathIcon className={`h-5 w-5 md:h-4 md:w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          )}
          <button
            onClick={() => onRemove(institution.id)}
            className="cursor-pointer rounded-md border border-red-300 p-2 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 md:p-1.5"
            title="Remove institution"
          >
            <TrashIcon className="h-5 w-5 md:h-4 md:w-4" />
          </button>
        </div>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {institution.accounts.length === 0 ? (
          <p className="px-5 py-4 text-sm text-zinc-500 dark:text-zinc-400">
            No accounts found. Try refreshing.
          </p>
        ) : (
          institution.accounts.map((account) => (
            <AccountRow key={account.id} account={account} onHidden={onAccountHidden} />
          ))
        )}
      </div>
    </div>
  );
}
