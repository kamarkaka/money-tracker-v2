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
import { PlusIcon, BuildingLibraryIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
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
  const [fabOpen, setFabOpen] = useState(false);
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{i18n("title")}</h1>
        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={() => setShowManual(true)}
            className="flex cursor-pointer items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            <PencilSquareIcon className="h-4 w-4" />
            {i18n("addManual")}
          </button>
          <button
            onClick={() => { setRefreshData(null); setShowAdd(true); }}
            className="flex cursor-pointer items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover"
          >
            <BuildingLibraryIcon className="h-4 w-4" />
            {i18n("linkBank")}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3">
        {/* Net Worth — full width on mobile, first col on desktop */}
        <div className={`col-span-2 rounded-lg border px-4 py-4 text-center md:col-span-1 ${
          netWorth >= 0
            ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900"
            : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900"
        }`}>
          <p className={`text-xs font-medium md:text-sm ${
            netWorth >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-400"
          }`}>{i18n("netWorth")}</p>
          <p className="mt-1 flex justify-center text-3xl font-bold md:text-2xl">
            <SlotNumber
              value={formatCurrency(netWorth, "USD", true)}
              className={netWorth >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}
            />
          </p>
        </div>

        {/* Assets */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-center dark:border-emerald-800 dark:bg-emerald-900">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 md:text-sm">{i18n("totalAssets")}</p>
          <p className="mt-1 flex justify-center text-xl font-bold md:text-2xl">
            <SlotNumber value={formatCurrency(totalAssets, "USD", true)} className="text-emerald-600 dark:text-emerald-400" />
          </p>
        </div>

        {/* Liabilities */}
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-center dark:border-red-800 dark:bg-red-900">
          <p className="text-xs font-medium text-red-700 dark:text-red-400 md:text-sm">{i18n("totalLiabilities")}</p>
          <p className="mt-1 flex justify-center text-xl font-bold md:text-2xl">
            <SlotNumber value={formatCurrency(totalLiabilities, "USD", true)} className="text-red-600 dark:text-red-400" />
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
        <div className="flex flex-col gap-4">
          {institutions.map((inst, index) => (
            <InstitutionCard
              key={inst.id}
              institution={inst}
              colorIndex={index}
              onRemove={(id) => setRemoveId(id)}
              onRefresh={handleRefresh}
              onAccountHidden={fetchInstitutions}
              refreshing={showAdd && refreshData?.institutionId === inst.id}
            />
          ))}
        </div>
      )}

      {/* FAB — mobile only */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 md:hidden">
        {/* Expanded options */}
        {fabOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 -z-10" onClick={() => setFabOpen(false)} />
            <button
              onClick={() => { setRefreshData(null); setShowAdd(true); setFabOpen(false); }}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-medium text-accent-text shadow-lg hover:bg-accent-hover"
            >
              <BuildingLibraryIcon className="h-5 w-5" />
              {i18n("linkBank")}
            </button>
            <button
              onClick={() => { setShowManual(true); setFabOpen(false); }}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-emerald-600"
            >
              <PencilSquareIcon className="h-5 w-5" />
              {i18n("addManual")}
            </button>
          </>
        )}
        {/* FAB button */}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className="cursor-pointer flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-text shadow-lg hover:bg-accent-hover"
          style={{ transition: "transform 0.3s ease", transform: fabOpen ? "rotate(135deg)" : "rotate(0deg)" }}
        >
          <PlusIcon className="h-7 w-7" />
        </button>
      </div>

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
