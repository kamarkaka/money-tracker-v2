"use client";

import { useTheme } from "@/app/components/ThemeProvider";
import { SunIcon, MoonIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";

const THEME_OPTIONS = [
  { value: "light" as const, label: "Light", icon: SunIcon, description: "Always use light mode" },
  { value: "dark" as const, label: "Dark", icon: MoonIcon, description: "Always use dark mode" },
  { value: "system" as const, label: "System", icon: ComputerDesktopIcon, description: "Follow your browser setting" },
];

export default function SettingPage() {
  const { theme, setTheme } = useTheme();
 
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Setting</h1>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Appearance</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Choose how Money Track looks to you.
        </p>

        <div className="flex gap-4">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = theme === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`cursor-pointer flex flex-1 flex-col items-center gap-2 rounded-lg border-2 px-4 py-5 transition-colors ${
                  selected
                    ? "border-zinc-900 bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-800"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                }`}
              >
                <Icon className={`h-6 w-6 ${selected ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400 dark:text-zinc-500"}`}/>
                <span className={`text-sm font-medium ${selected ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-600 dark:text-zinc-400"}`}>
                  {option.value}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {option.description}
                </span>

              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
