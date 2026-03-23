"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { NextIntlClientProvider } from "next-intl";
import { DEFAULT_LOCALE, isValidLocale } from "@/app/i18n/config";
import type { Locale } from "@/app/i18n/config";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

export function useLocale() {
  return useContext(LocaleContext);
}

async function loadMessages(locale: string): Promise<Record<string, unknown>> {
  switch (locale) {
    case "zh":
      return (await import("@/app/messages/zh.json")).default;
    case "es":
      return (await import("@/app/messages/es.json")).default;
    case "fr":
      return (await import("@/app/messages/fr.json")).default;
    default:
      return (await import("@/app/messages/en.json")).default;
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/setting")
      .then((res) => res.json())
      .then(async (data) => {
        const lang = isValidLocale(data.language) ? data.language : DEFAULT_LOCALE;
        const msgs = await loadMessages(lang);
        setLocaleState(lang);
        setMessages(msgs);
      })
      .catch(async () => {
        const msgs = await loadMessages(DEFAULT_LOCALE);
        setMessages(msgs);
      });
  }, []);

  const setLocale = useCallback(async (newLocale: Locale) => {
    const msgs = await loadMessages(newLocale);
    setLocaleState(newLocale);
    setMessages(msgs);

    fetch("/api/setting", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: newLocale }),
    });
  }, []);

  if (!messages) return null;

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
