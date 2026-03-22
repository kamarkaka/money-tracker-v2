"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type Mode = "pro" | "casual";

interface ModeContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
  loading: boolean;
}

const ModeContext = createContext<ModeContextValue>({
  mode: "pro",
  setMode: () => {},
  loading: true,
});

export function useMode() {
  return useContext(ModeContext);
}

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>("casual");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/setting")
      .then((res) => res.json())
      .then((data) => {
        if (data.mode === "casual" || data.mode === "pro") {
          setModeState(data.mode);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setMode = useCallback(async (newMode: Mode) => {
    setModeState(newMode);
    await fetch("/api/setting", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: newMode }),
    });
  }, []);

  return (
    <ModeContext.Provider value={{ mode, setMode, loading }}>
      {children}
    </ModeContext.Provider>
  );
}
