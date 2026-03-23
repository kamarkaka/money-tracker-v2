"use client";

import { useState } from "react";
import { CheckBadgeIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { ConnectInstitutionModal } from "@/app/components/account/ConnectInstitutionModal";
import { ManualAccountModal } from "@/app/components/account/ManualAccountModal";

interface BankLinkStepProps {
  onNext: (accountsLinked: number) => void;
  onSkip: () => void;
}

export function BankLinkStep({ onNext, onSkip }: BankLinkStepProps) {
  const [showConnect, setShowConnect] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [linkedCount, setLinkedCount] = useState(0);

  const handleComplete = () => {
    setLinkedCount((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col items-center px-8 py-8">
      <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Add Bank Accounts
      </h2>

      <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20">
        <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Your bank credentials are securely handled by our banking partner and are{" "}
          <strong>never stored</strong> on our servers.
        </p>
      </div>

      <div className="mb-4 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:green-blue-800 dark:bg-green-900/20">
        <CheckBadgeIcon className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
        <p className="text-sm text-green-700 dark:text-green-300">
          Not comfortable sharing your bank credentials? No problem! You can alwasy add accounts and transactions manually.
        </p>
      </div>

      {linkedCount > 0 && (
        <div className="mb-4 rounded-md bg-green-50 px-4 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          {linkedCount} account{linkedCount !== 1 ? "s" : ""} added successfully!
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-3">
          <button
            onClick={() => setShowConnect(true)}
            className="cursor-pointer rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-text hover:bg-accent-hover"
          >
            Link Bank Account
          </button>
          <button
            onClick={() => setShowManual(true)}
            className="cursor-pointer rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Add Manually
          </button>
        </div>

        <button
          onClick={() => onNext(linkedCount)}
          className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {linkedCount > 0 ? "Continue" : "Skip for Now"}
        </button>

      </div>

      <ConnectInstitutionModal
        open={showConnect}
        onClose={() => setShowConnect(false)}
        onComplete={handleComplete}
      />

      <ManualAccountModal
        open={showManual}
        onClose={() => setShowManual(false)}
        onComplete={handleComplete}
      />
    </div>
  );
}
