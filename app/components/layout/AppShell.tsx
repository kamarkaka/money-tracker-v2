"use client";

import { useState, useEffect } from "react";
import { Topbar } from "./Topbar";
import { TutorialOverlay } from "@/app/components/tutorial/TutorialOverlay";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import { LocaleProvider } from "@/app/components/LocaleProvider";

interface AppShellProps {
  children: React.ReactNode;
  userName?: string | null;
  userImage?: string | null;
}

export function AppShell({ children, userName, userImage }: AppShellProps) {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    async function checkTutorial() {
      try {
        const res = await fetch("/api/profile");
        const profile = await res.json();
        if (profile.hasCompletedTutorial === false) {
          // Also check if user has zero categories (new user)
          const catRes = await fetch("/api/category");
          const categories = await catRes.json();
          if (Array.isArray(categories) && categories.length === 0) {
            setShowTutorial(true);
          }
        }
      } catch {
        // Silently ignore - don't block the app
      }
    }
    checkTutorial();
  }, []);

  // Listen for manual tutorial trigger
  useEffect(() => {
    const handler = () => setShowTutorial(true);
    window.addEventListener("start-tutorial", handler);
    return () => window.removeEventListener("start-tutorial", handler);
  }, []);

  return (
    <ThemeProvider>
      <LocaleProvider>
        <div className="min-h-screen bg-page-bg">
          <Topbar userName={userName} userImage={userImage} />
          <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">{children}</main>
          {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}
        </div>
      </LocaleProvider>
    </ThemeProvider>
  );
}
