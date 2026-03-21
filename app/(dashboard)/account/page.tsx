"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { InstitutionCard } from "@/app/components/account/InstitutionCard";
import { ConnectInstitutionModal } from "@/app/components/account/ConnectInstitutionModal";
import { ManualAccountModal } from "@/app/components/account/ManualAccountModal";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { CurrencyDisplay } from "@/app/components/ui/CurrencyDisplay";
import { SlotNumber } from "@/app/components/ui/SlotNumber";
import { formatCurrency } from "@/app/lib/utils";
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

      <div className="card-hover mb-6 rounded-lg bg-accent px-5 py-5 text-accent-text md:px-6 md:py-6">
        {/* Net Worth — big and prominent */}
        <div className="text-center">
          <p className="text-xs font-medium opacity-80 md:text-sm">{i18n("netWorth")}</p>
          <p className="mt-1 flex justify-center text-3xl font-bold md:text-4xl">
            <SlotNumber value={formatCurrency(netWorth, "USD", true)} className="text-white" />
          </p>
        </div>

        {/* Assets & Liabilities — smaller, side by side */}
        <div className="mt-4 flex">
          <div className="flex-1 text-center">
            <p className="text-xs font-medium opacity-80">{i18n("totalAssets")}</p>
            <p className="mt-1 flex justify-center text-lg font-semibold md:text-xl">
              <SlotNumber value={formatCurrency(totalAssets, "USD", true)} className="text-white" />
            </p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-xs font-medium opacity-80">{i18n("totalLiabilities")}</p>
            <p className="mt-1 flex justify-center text-lg font-semibold md:text-xl">
              <SlotNumber value={formatCurrency(totalLiabilities, "USD", true)} className="text-white" />
            </p>
          </div>
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
