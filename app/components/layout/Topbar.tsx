"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { cn } from "@/app/lib/utils";
import { useTheme } from "@/app/components/ThemeProvider";
import { SunIcon, MoonIcon, UserCircleIcon, Cog6ToothIcon, ArrowRightStartOnRectangleIcon, LanguageIcon } from "@heroicons/react/24/outline";
import { useLocale } from "@/app/components/LocaleProvider";
import type { Locale } from "@/app/i18n/config";

export function Topbar({ userName, userImage }: { userName?: string | null; userImage?: string | null }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const i18n = useTranslations("nav");
  const i18nAuth = useTranslations("auth");
  const i18nSetting = useTranslations("setting");
  const { locale, setLocale } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  const LANGS: { code: Locale; flag: string; label: string }[] = [
    { code: "en", flag: "🇺🇸", label: "EN" },
    { code: "zh", flag: "🇨🇳", label: "中" },
  ];

  const NAV_ITEMS = [
    { href: "/overview", label: i18n("overview") },
    { href: "/category", label: i18n("category") },
    { href: "/budget", label: i18n("budget") },
    { href: "/account", label: i18n("account") },
    { href: "/transaction", label: i18n("transaction") },
    { href: "/rule", label: i18n("rule") },
  ];

  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  useEffect(() => {
    if (!menuOpen && !langOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (langOpen && langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen, langOpen]);

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-16 min-w-[960px] max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="App Logo"
            width={32}
            height={32}
            className="rounded-sm"
          />
          <Link href="/overview" className="cursor-pointer text-lg font-bold text-zinc-900 dark:text-zinc-50 mr-8
          ">
            Money Tracker 2
            <span className="relative -top-3 -right-1 rounded-full border border-red-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-500">
              alpha
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-2 text-sm transition-colors",
                  pathname === item.href
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50 font-semibold"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50 font-medium"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-100 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-800 dark:hover:bg-zinc-300"
            title={isDark ? i18nSetting("light") : i18nSetting("dark")}
          >
            {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>
          {userName && (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="cursor-pointer flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-zinc-700 ring-2 ring-zinc-200 hover:ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:ring-zinc-500"
              >
                {userImage ? (
                  <Image
                    src={userImage}
                    alt={userName}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <UserCircleIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-40 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="cursor-pointer flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    <UserCircleIcon className="h-4 w-4" />
                    {i18n("profile")}
                  </Link>
                  <Link
                    href="/setting"
                    onClick={() => setMenuOpen(false)}
                    className="cursor-pointer flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    <Cog6ToothIcon className="h-4 w-4" />
                    {i18n("setting")}
                  </Link>
                  <div className="border-t border-zinc-200 dark:border-zinc-700">
                    <button
                      onClick={() => signOut({ redirectTo: "/login" })}
                      className="cursor-pointer flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                      {i18nAuth("logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={langRef} className="relative">
            <button
              onClick={() => { setLangOpen(!langOpen); setMenuOpen(false); }}
              className="cursor-pointer flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-sm font-medium text-zinc-700 ring-2 ring-zinc-200 hover:ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:ring-zinc-500"
              title={i18nSetting("language")}
            >
              {LANGS.find((l) => l.code === locale)?.label || <LanguageIcon className="h-5 w-5" />}
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                {LANGS.filter((l) => l.code !== locale).map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLocale(l.code); setLangOpen(false); }}
                    className="cursor-pointer flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
