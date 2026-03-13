"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { InstitutionCard } from "@/app/components/account/InstitutionCard";
import { ConnectInstitutionModal } from "@/app/components/account/ConnectInstitutionModal";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { CurrencyDisplay } from "@/app/components/ui/CurrencyDisplay";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: string | number;
  currency: string;
}

interface Institution {
  id: string;
  name: string;
  sophtronMemberId: string;
  updatedAt: string;
  accounts: Account[];
}

export default function AccountPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [refreshData, setRefreshData] = useState<{
    institutionId: string;
    institutionName: string;
  } | null>(null);

  const netWorth = useMemo(() => {
    const LIABILITY_TYPES = ["credit_card", "loan"];
    return institutions.reduce((total, inst) => {
      return inst.accounts.reduce((sum, acct) => {
        const bal = typeof acct.balance === "string" ? parseFloat(acct.balance) : acct.balance;
        const isLiability = LIABILITY_TYPES.includes(acct.type.toLowerCase());
        return sum + (isLiability ? -Math.abs(bal) : Math.abs(bal));
      }, total);
    }, 0);
  }, [institutions]);

  const fetchInstitutions = useCallback(async () => {
    const res = await fetch("/api/institution");
    const data = await res.json();
    setInstitutions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInstitutions();
  }, [fetchInstitutions]);

  const handleRemove = async () => {
    if (!removeId) return;
    setRemoving(true);
    await fetch(`/api/institution/${removeId}`, { method: "DELETE" });
    setRemoveId(null);
    setRemoving(false);
    await fetchInstitutions();
  };

  const handleRefresh = (institutionId: string) => {
    const inst = institutions.find((i) => i.id === institutionId);
    if (!inst) return;
    setRefreshData({
      institutionId: inst.id,
      institutionName: inst.name,
    });
    setShowAdd(true);
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const res = await fetch("/api/backfill", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(`Backfill failed: ${data.error}`);
      }
      await fetchInstitutions();
    } catch (err) {
      alert(`Backfill failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBackfilling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Accounts</h1>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Net Worth: <CurrencyDisplay amount={netWorth} />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleBackfill}
            disabled={backfilling}
            className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {backfilling ? "Backfilling..." : "Backfill from Sophtron"}
          </button>
          <button
            onClick={() => { setRefreshData(null); setShowAdd(true); }}
            className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Add Institution
          </button>
        </div>
      </div>

      {institutions.length === 0 ? (
        <EmptyState
          title="No institutions linked"
          description="Add a financial institution to start syncing your accounts."
          action={
            <button
              onClick={() => { setRefreshData(null); setShowAdd(true); }}
              className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Add Institution
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {institutions.map((inst) => (
            <InstitutionCard
              key={inst.id}
              institution={inst}
              onRemove={(id) => setRemoveId(id)}
              onRefresh={handleRefresh}
              onAccountHidden={fetchInstitutions}
              refreshing={showAdd && refreshData?.institutionId === inst.id}
            />
          ))}
        </div>
      )}

      <ConnectInstitutionModal
        open={showAdd}
        onClose={() => { setShowAdd(false); setRefreshData(null); }}
        onComplete={fetchInstitutions}
        refreshData={refreshData}
      />

      <ConfirmDialog
        open={!!removeId}
        onClose={() => setRemoveId(null)}
        onConfirm={handleRemove}
        title="Remove Institution"
        message="Are you sure you want to remove this institution? All associated accounts and transactions will be deleted."
        confirmLabel="Remove"
        loading={removing}
      />
    </div>
  );
}
