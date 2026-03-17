"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    // system - check media query
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }
}

export function ThemeProvider({ children } : { children: React.ReactNode}) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [loaded, setLoaded] = useState(false);

  // Load theme from API on mount
  useEffect(() => {
    fetch("/api/setting")
      .then((res) => res.json())
      .then((data) => {
        const t = (data.theme as Theme) || "system";
        setThemeState(t);
        applyTheme(t);
        setLoaded(true);
      })
      .catch(() => {
        applyTheme("system");
        setLoaded(true);
      });
  }, []);

  // Listen for system theme changes when in "system" mode
  useEffect(() => {
    if (!loaded) return;
    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, loaded]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);

    // Persist to server (fire-and-forget)
    fetch("/api/setting", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: newTheme }),
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
