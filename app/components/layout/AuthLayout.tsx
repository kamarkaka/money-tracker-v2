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
        <div className="flex min-h-screen items-center justify-center bg-page-bg">
          <div className="w-full max-w-md rounded-xl border border-card-border bg-card-bg p-8 shadow-sm">
            {children}
          </div>
        </div>
      </LocaleProvider>
    </ThemeProvider>
  );
}
