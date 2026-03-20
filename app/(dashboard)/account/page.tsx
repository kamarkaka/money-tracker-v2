"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { InstitutionCard } from "@/app/components/account/InstitutionCard";
import { ConnectInstitutionModal } from "@/app/components/account/ConnectInstitutionModal";
import { ManualAccountModal } from "@/app/components/account/ManualAccountModal";
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
  isManual: boolean;
  isHidden: boolean;
}

interface Institution {
  id: string;
  name: string;
  sophtronMemberId: string | null;
  isManual: boolean;
  updatedAt: string;
  accounts: Account[];
}

export default function AccountPage() {
  const i18n = useTranslations("account");
  const i18nc = useTranslations("common");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [refreshData, setRefreshData] = useState<{
    institutionId: string;
    institutionName: string;
  } | null>(null);

  const netWorth = useMemo(() => {
    const LIABILITY_TYPES = ["credit_card", "loan"];
    return institutions.reduce((total, inst) => {
      return inst.accounts.reduce((sum, acct) => {
        if (acct.isHidden) return sum;
        const bal = typeof acct.balance === "string" ? parseFloat(acct.balance) : acct.balance;
        const isLiability = LIABILITY_TYPES.includes(acct.type.toLowerCase());
        return sum + (isLiability ? -Math.abs(bal) : bal);
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


  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-baseline gap-4">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{i18n("title")}</h1>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {i18n("netWorth")}: <CurrencyDisplay amount={netWorth} />
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:gap-3">
          <button
            onClick={() => setShowManual(true)}
            className="cursor-pointer rounded-md border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 md:py-2"
          >
            {i18n("addManual")}
          </button>
          <button
            onClick={() => { setRefreshData(null); setShowAdd(true); }}
            className="cursor-pointer rounded-md bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 md:py-2"
          >
            {i18n("linkBank")}
          </button>
        </div>
      </div>

      {institutions.length === 0 ? (
        <EmptyState
          title={i18n("noInstitutions")}
          description={i18n("noInstitutionsDesc")}
          action={
            <button
              onClick={() => { setRefreshData(null); setShowAdd(true); }}
              className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {i18n("addInstitution")}
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

      <ManualAccountModal
        open={showManual}
        onClose={() => setShowManual(false)}
        onComplete={fetchInstitutions}
      />

      <ConfirmDialog
        open={!!removeId}
        onClose={() => setRemoveId(null)}
        onConfirm={handleRemove}
        title={i18n("removeInstitution")}
        message={i18n("removeWarning")}
        confirmLabel={i18nc("delete")}
        loading={removing}
      />
    </div>
  );
}
