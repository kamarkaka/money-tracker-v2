"use client";

import { useState } from "react";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { ConnectInstitutionModal } from "@/app/components/account/ConnectInstitutionModal";

interface BankLinkStepProps {
  onNext: (accountsLinked: number) => void;
  onSkip: () => void;
}

export function BankLinkStep({ onNext, onSkip }: BankLinkStepProps) {
  const [showModal, setShowModal] = useState(false);
  const [linkedCount, setLinkedCount] = useState(0);

  const handleComplete = () => {
    setLinkedCount((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col items-center px-8 py-8">
      <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Link Bank Accounts
      </h2>

      <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20">
        <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Your bank credentials are securely handled by our banking partner and are{" "}
          <strong>never stored</strong> on our servers. We only receive your account balances
          and transaction data.
        </p>
      </div>

      <p className="mb-6 max-w-md text-center text-sm text-zinc-600 dark:text-zinc-400">
        Link your bank accounts to automatically import transactions. This helps you track
        spending without manual entry.
      </p>

      {linkedCount > 0 && (
        <div className="mb-4 rounded-md bg-green-50 px-4 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          {linkedCount} institution{linkedCount !== 1 ? "s" : ""} linked successfully!
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => setShowModal(true)}
          className="cursor-pointer rounded-md bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {linkedCount > 0 ? "Link Another Account" : "Link a Bank Account"}
        </button>

        <button
          onClick={() => onNext(linkedCount)}
          className="cursor-pointer rounded-md border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {linkedCount > 0 ? "Continue" : "Skip for Now"}
        </button>

        {linkedCount === 0 && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            You can always link accounts later from the Accounts page.
          </p>
        )}
      </div>

      <ConnectInstitutionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onComplete={handleComplete}
      />
    </div>
  );
}
