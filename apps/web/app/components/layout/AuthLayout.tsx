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
          <div className="w-full max-w-md px-6 py-8 md:rounded-xl md:border md:border-card-border md:bg-card-bg md:p-8 md:shadow-sm">
            {children}
          </div>
        </div>
      </LocaleProvider>
    </ThemeProvider>
  );
}
