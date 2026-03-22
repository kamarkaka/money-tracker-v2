"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/app/components/ThemeProvider";
import { useLocale } from "@/app/components/LocaleProvider";
import { useMode } from "@/app/components/ModeProvider";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { SUPPORTED_LOCALES } from "@/app/i18n/config";
import type { Locale } from "@/app/i18n/config";
import { SunIcon, MoonIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";

export default function SettingPage() {
  const i18n = useTranslations("setting");
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const { mode, setMode } = useMode();
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);

  const THEME_OPTIONS = [
    { value: "light" as const, icon: SunIcon, label: i18n("light"), description: i18n("lightDesc") },
    { value: "dark" as const, icon: MoonIcon, label: i18n("dark"), description: i18n("darkDesc") },
    { value: "system" as const, icon: ComputerDesktopIcon, label: i18n("system"), description: i18n("systemDesc") },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{i18n("title")}</h1>
      </div>

      <div className="rounded-lg border border-card-border bg-card-bg p-4 md:p-6">
        <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{i18n("appearance")}</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          {i18n("appearanceDesc")}
        </p>

        <div className="grid grid-cols-3 gap-2 md:gap-4">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = theme === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`cursor-pointer flex flex-col items-center gap-2 rounded-lg border-2 px-2 py-3 transition-colors md:px-4 md:py-5 ${
                  selected
                    ? "border-accent bg-accent-subtle"
                    : "border-card-border hover:border-accent/50 hover:bg-accent-subtle/50"
                }`}
              >
                <Icon className={`h-6 w-6 ${selected ? "text-accent" : "text-zinc-400 dark:text-zinc-500"}`}/>
                <span className={`text-sm font-medium ${selected ? "text-accent font-semibold" : "text-zinc-600 dark:text-zinc-400"}`}>
                  {option.label}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-card-border bg-card-bg p-4 md:p-6">
        <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{i18n("language")}</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          {i18n("languageDesc")}
        </p>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
          {SUPPORTED_LOCALES.map((loc) => {
            const selected = locale === loc.code;
            return (
              <button
                key={loc.code}
                onClick={() => setLocale(loc.code as Locale)}
                className={`cursor-pointer flex min-w-0 flex-col items-center gap-1 overflow-hidden rounded-lg border-2 px-1 py-3 transition-colors md:px-4 md:py-5 ${
                  selected
                    ? "border-accent bg-accent-subtle"
                    : "border-card-border hover:border-accent/50 hover:bg-accent-subtle/50"
                }`}
              >
                <span className="text-2xl md:text-3xl">{loc.flag}</span>
                <span className={`w-full truncate text-center text-sm font-medium md:text-base ${selected ? "text-accent font-semibold" : "text-zinc-600 dark:text-zinc-400"}`}>
                  {loc.nativeLabel}
                </span>
                <span className="hidden text-xs text-zinc-500 dark:text-zinc-400 md:block">
                  {loc.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {mode === "casual" && (
        <div className="mt-6 rounded-lg border border-card-border bg-gradient-to-r from-blue-50 to-white p-4 dark:from-blue-950 dark:to-zinc-900 md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white">
              <ChartBarIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{i18n("switchToPro")}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{i18n("switchToProDesc")}</p>
            </div>
          </div>
          <button
            onClick={() => setShowSwitchConfirm(true)}
            className="mt-4 w-full cursor-pointer rounded-md bg-accent px-4 py-3 text-sm font-medium text-accent-text hover:bg-accent-hover md:w-auto md:py-2"
          >
            {i18n("switchToPro")}
          </button>
          <ConfirmDialog
            open={showSwitchConfirm}
            onClose={() => setShowSwitchConfirm(false)}
            onConfirm={async () => {
              await setMode("pro");
              setShowSwitchConfirm(false);
              window.location.reload();
            }}
            title={i18n("switchToPro")}
            message={i18n("switchToProConfirm")}
            confirmLabel={i18n("switchToPro")}
          />
        </div>
      )}
    </div>
  );
}
