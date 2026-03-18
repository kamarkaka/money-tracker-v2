"use client";

import { ThemeProvider } from "@/app/components/ThemeProvider";
import { LocaleProvider } from "@/app/components/LocaleProvider";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {children}
          </div>
        </div>
      </LocaleProvider>
    </ThemeProvider>
  );
}
