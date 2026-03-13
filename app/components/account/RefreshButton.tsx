"use client";

import { useState } from "react";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";

interface RefreshButtonProps {
  institutionId: string;
  onRefreshed: () => void;
}

export function RefreshButton({ institutionId, onRefreshed }: RefreshButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    await fetch(`/api/institution/${institutionId}/refresh`, { method: "POST" });
    setLoading(false);
    onRefreshed();
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className="cursor-pointer flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {loading ? (
        <>
          <LoadingSpinner className="h-3 w-3" />
          Refreshing...
        </>
      ) : (
        "Refresh"
      )}
    </button>
  );
}
