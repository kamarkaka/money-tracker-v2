"use client";

import { useState } from "react";
import { ChartBarIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

interface ModeSelectionStepProps {
  onSelectPro: () => void;
  onSelectCasual: () => void;
}

export function ModeSelectionStep({ onSelectPro, onSelectCasual }: ModeSelectionStepProps) {
  const [loading, setLoading] = useState(false);
  const i18n = useTranslations("tutorial");

  const handleCasual = async () => {
    setLoading(true);
    await fetch("/api/casual/setup", { method: "POST" });
    onSelectCasual();
  };

  return (
    <div className="flex flex-col items-center px-6 py-8 md:px-8">
      <h2 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">
        {i18n("modeTitle")}
      </h2>
      <p className="mb-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {i18n("modeDescription")}
      </p>

      <div className="grid w-full max-w-lg grid-cols-1 gap-4 md:grid-cols-2">
        {/* Casual */}
        <button
          onClick={handleCasual}
          disabled={loading}
          className="card-hover flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-card-border bg-gradient-to-b from-emerald-50 to-white p-6 text-center transition-colors hover:border-emerald-400 disabled:opacity-50 dark:from-emerald-950 dark:to-zinc-900"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
            <SparklesIcon className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {i18n("modeCasualTitle")}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {i18n("modeCasualDesc")}
          </p>
          <ul className="mt-1 space-y-1 text-left text-xs text-zinc-600 dark:text-zinc-300">
            <li>✨ {i18n("modeCasualPoint1")}</li>
            <li>😀 {i18n("modeCasualPoint2")}</li>
            <li>⚡ {i18n("modeCasualPoint3")}</li>
          </ul>
        </button>

        {/* Pro */}
        <button
          onClick={onSelectPro}
          disabled={loading}
          className="card-hover flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-card-border bg-gradient-to-b from-blue-50 to-white p-6 text-center transition-colors hover:border-accent disabled:opacity-50 dark:from-blue-950 dark:to-zinc-900"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white">
            <ChartBarIcon className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {i18n("modeProTitle")}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {i18n("modeProDesc")}
          </p>
          <ul className="mt-1 space-y-1 text-left text-xs text-zinc-600 dark:text-zinc-300">
            <li>🏦 {i18n("modeProPoint1")}</li>
            <li>📊 {i18n("modeProPoint2")}</li>
            <li>🏷️ {i18n("modeProPoint3")}</li>
          </ul>
        </button>
      </div>
    </div>
  );
}
