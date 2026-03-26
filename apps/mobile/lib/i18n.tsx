import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { createSettingsApi } from "@money-tracker/api-client";
import { apiClient } from "./api";

// Import message files directly
import en from "@/assets/i18n/en.json";
import zh from "@/assets/i18n/zh.json";

const MESSAGES: Record<string, Record<string, unknown>> = { en, zh };

type Messages = Record<string, unknown>;

function getNestedValue(obj: Messages, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : path;
}

interface I18nContextValue {
  locale: string;
  setLocale: (locale: string) => void;
  i18n: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  i18n: (key) => key,
});

export function useI18n() {
  return useContext(I18nContext);
}

// Standalone translation function (for use outside provider)
export function t(locale: string, key: string): string {
  const msgs = MESSAGES[locale] || MESSAGES.en;
  return getNestedValue(msgs as Messages, key);
}

export function I18nProvider({ children, initialLocale = "en" }: { children: ReactNode; initialLocale?: string }) {
  const [locale, setLocaleState] = useState(initialLocale);

  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  const setLocale = useCallback(async (code: string) => {
    setLocaleState(code);
    try {
      const api = createSettingsApi(apiClient);
      await api.update({ language: code });
    } catch {
      // ignore
    }
  }, []);

  const i18n = useCallback((key: string): string => {
    const msgs = MESSAGES[locale] || MESSAGES.en;
    return getNestedValue(msgs as Messages, key);
  }, [locale]);

  return (
    <I18nContext.Provider value={useMemo(() => ({ locale, setLocale, i18n }), [locale, setLocale, i18n])}>
      {children}
    </I18nContext.Provider>
  );
}
