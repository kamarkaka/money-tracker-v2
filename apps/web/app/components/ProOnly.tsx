"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMode } from "./ModeProvider";

export function ProOnly({ children }: { children: React.ReactNode }) {
  const { mode, loading } = useMode();
  const router = useRouter();

  useEffect(() => {
    if (!loading && mode === "casual") {
      router.replace("/overview");
    }
  }, [mode, loading, router]);

  if (loading || mode === "casual") return null;

  return <>{children}</>;
}
