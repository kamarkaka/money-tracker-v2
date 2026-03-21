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
import { PageTabs } from "@/app/components/ui/PageTabs";

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

  const { totalAssets, totalLiabilities, netWorth } = useMemo(() => {
    const LIABILITY_TYPES = ["credit_card", "loan"];
    let assets = 0;
    let liabilities = 0;
    for (const inst of institutions) {
      for (const acct of inst.accounts) {
        if (acct.isHidden) continue;
        const bal = typeof acct.balance === "string" ? parseFloat(acct.balance) : acct.balance;
        if (LIABILITY_TYPES.includes(acct.type.toLowerCase())) {
          liabilities += Math.abs(bal);
        } else {
          assets += bal;
        }
      }
    }
    return { totalAssets: assets, totalLiabilities: liabilities, netWorth: assets - liabilities };
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
        <PageTabs />
        <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:gap-3">
          <button
            onClick={() => setShowManual(true)}
            className="cursor-pointer rounded-md border border-card-border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-accent-subtle hover:text-accent dark:text-zinc-300"
          >
            {i18n("addManual")}
          </button>
          <button
            onClick={() => { setRefreshData(null); setShowAdd(true); }}
            className="cursor-pointer rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover"
          >
            {i18n("linkBank")}
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-2 md:gap-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 md:text-sm">{i18n("totalAssets")}</p>
          <p className="mt-1 text-lg font-bold md:text-2xl">
            <CurrencyDisplay amount={totalAssets} className="text-emerald-600 dark:text-emerald-400" />
          </p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-center dark:border-red-800 dark:bg-red-950/30">
          <p className="text-xs font-medium text-red-700 dark:text-red-400 md:text-sm">{i18n("totalLiabilities")}</p>
          <p className="mt-1 text-lg font-bold md:text-2xl">
            <CurrencyDisplay amount={-totalLiabilities} className="text-red-600 dark:text-red-400" />
          </p>
        </div>
        <div className={`rounded-lg border px-4 py-4 text-center ${
          netWorth >= 0
            ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
            : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
        }`}>
          <p className={`text-xs font-medium md:text-sm ${
            netWorth >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-400"
          }`}>{i18n("netWorth")}</p>
          <p className="mt-1 text-lg font-bold md:text-2xl">
            <CurrencyDisplay
              amount={netWorth}
              className={netWorth >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}
            />
          </p>
        </div>
      </div>

      {institutions.length === 0 ? (
        <EmptyState
          title={i18n("noInstitutions")}
          description={i18n("noInstitutionsDesc")}
          action={
            <button
              onClick={() => { setRefreshData(null); setShowAdd(true); }}
              className="cursor-pointer rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover"
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
