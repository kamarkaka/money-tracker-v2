"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { cn } from "@/app/lib/utils";
import { useTheme } from "@/app/components/ThemeProvider";
import { SunIcon, MoonIcon, UserCircleIcon, Cog6ToothIcon, ArrowRightStartOnRectangleIcon, LanguageIcon, TagIcon, CurrencyDollarIcon, FunnelIcon, BookmarkIcon, Bars3Icon, XMarkIcon, ChartBarIcon, BuildingLibraryIcon, ListBulletIcon } from "@heroicons/react/24/outline";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  const LANGS: { code: Locale; flag: string; label: string }[] = [
    { code: "en", flag: "🇺🇸", label: "EN" },
    { code: "zh", flag: "🇨🇳", label: "中" },
  ];

  const NAV_ITEMS = [
    { href: "/overview", label: i18n("overview"), icon: ChartBarIcon },
    { href: "/account", label: i18n("account"), icon: BuildingLibraryIcon },
    { href: "/transaction", label: i18n("transaction"), icon: ListBulletIcon },
  ];

  const MENU_ITEMS = [
    { href: "/category", label: i18n("category"), icon: BookmarkIcon },
    { href: "/budget", label: i18n("budget"), icon: CurrencyDollarIcon },
    { href: "/rule", label: i18n("rule"), icon: FunnelIcon },
    { href: "/tag", label: i18n("tag"), icon: TagIcon },
  ];

  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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

  const linkClass = (href: string) => cn(
    "cursor-pointer rounded-md px-3 py-2.5 text-base transition-colors md:py-2 md:text-sm",
    pathname === href
      ? "bg-accent-subtle text-accent font-semibold"
      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50 font-medium"
  );

  return (
    <header className="border-b border-card-border bg-card-bg md:sticky md:top-0 md:z-50">
      <div className="relative mx-auto flex h-14 max-w-7xl items-center justify-between md:h-16 md:px-6">
        {/* Mobile: centered title */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none md:hidden">
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Money Tracker 2
            <span className="relative -top-3 -right-1 rounded-full border border-red-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-500">
              alpha
            </span>
          </span>
        </div>

        {/* Left: logo + nav */}
        <div className="relative flex items-center md:gap-2">
          {/* Logo — mobile */}
          <Link href="/overview" className="md:hidden">
            <Image src="/logo.png" alt="App Logo" width={56} height={56} unoptimized className="h-14 w-14 rounded-sm object-cover" />
          </Link>
          {/* Desktop logo + title */}
          <Image
            src="/logo.png"
            alt="App Logo"
            width={32}
            height={32}
            unoptimized
            className="hidden rounded-sm md:block"
          />
          <Link href="/overview" className="hidden cursor-pointer text-lg font-bold text-zinc-900 dark:text-zinc-50 md:mr-8 md:inline">
            Money Tracker 2
            <span className="relative -top-3 -right-1 rounded-full border border-red-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-500">
              alpha
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right */}
        <div className="relative flex items-center gap-2 md:gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mr-2 cursor-pointer rounded-md p-2 text-zinc-600 hover:bg-accent-subtle hover:text-accent dark:text-zinc-400 md:mr-0 md:hidden"
          >
            {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
          <button
            onClick={toggleTheme}
            className="hidden cursor-pointer md:flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-100 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-800 dark:hover:bg-zinc-300"
            title={isDark ? i18nSetting("light") : i18nSetting("dark")}
          >
            {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>
          {userName && (
            <div ref={menuRef} className="relative hidden md:block">
              <button
                onClick={() => { setMenuOpen(!menuOpen); setLangOpen(false); }}
                className={`cursor-pointer flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-zinc-700 ring-2 hover:ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:ring-zinc-500 ${menuOpen ? "ring-zinc-400 dark:ring-zinc-500" : "ring-zinc-200 dark:ring-zinc-700"}`}
              >
                {userImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
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
                <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-lg border border-card-border bg-card-bg shadow-lg md:-right-11">
                  {MENU_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm ${
                        isActive
                          ? "bg-accent-subtle text-accent font-medium"
                          : "text-zinc-700 hover:bg-accent-subtle hover:text-accent dark:text-zinc-300"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                    );
                  })}
                  <div className="border-t border-card-border" />
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className={`cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm ${
                      pathname === "/profile"
                        ? "bg-accent-subtle text-accent font-medium"
                        : "text-zinc-700 hover:bg-accent-subtle hover:text-accent dark:text-zinc-300"
                    }`}
                  >
                    <UserCircleIcon className="h-4 w-4" />
                    {i18n("profile")}
                  </Link>
                  <Link
                    href="/setting"
                    onClick={() => setMenuOpen(false)}
                    className={`cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm ${
                      pathname === "/setting"
                        ? "bg-accent-subtle text-accent font-medium"
                        : "text-zinc-700 hover:bg-accent-subtle hover:text-accent dark:text-zinc-300"
                    }`}
                  >
                    <Cog6ToothIcon className="h-4 w-4" />
                    {i18n("setting")}
                  </Link>
                  <div className="border-t border-card-border">
                    <button
                      onClick={() => signOut().then(() => window.location.href = "/login")}
                      className="cursor-pointer flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                      {i18nAuth("logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={langRef} className="relative hidden md:block">
            <button
              onClick={() => { setLangOpen(!langOpen); setMenuOpen(false); }}
              className={`cursor-pointer flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-sm font-medium text-zinc-700 ring-2 hover:ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:ring-zinc-500 ${langOpen ? "ring-zinc-400 dark:ring-zinc-500" : "ring-zinc-200 dark:ring-zinc-700"}`}
              title={i18nSetting("language")}
            >
              {LANGS.find((l) => l.code === locale)?.label || <LanguageIcon className="h-5 w-5" />}
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-card-border bg-card-bg shadow-lg">
                {LANGS.filter((l) => l.code !== locale).map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLocale(l.code); setLangOpen(false); }}
                    className="cursor-pointer flex w-full items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 hover:bg-accent-subtle hover:text-accent dark:text-zinc-300"
                  >
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="flex flex-col gap-2 border-t border-card-border bg-card-bg px-3 py-3 md:hidden">
          {/* 1. Overview, Account, Transaction — 3 columns */}
          <div className="grid grid-cols-3 gap-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-4 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "border-accent bg-accent-subtle text-accent"
                    : "border-card-border text-zinc-600 hover:bg-accent-subtle hover:text-accent dark:text-zinc-400"
                )}
              >
                <item.icon className="h-8 w-8" />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="my-1 border-t border-card-border" />

          {/* 2. Category, Budget, Rule, Tag, Profile, Setting — 3x2 grid */}
          <div className="grid grid-cols-3 gap-2">
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-4 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "border-accent bg-accent-subtle text-accent"
                    : "border-card-border text-zinc-600 hover:bg-accent-subtle hover:text-accent dark:text-zinc-400"
                )}
              >
                <item.icon className="h-8 w-8" />
                {item.label}
              </Link>
            ))}
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-4 text-sm font-medium transition-colors",
                pathname === "/profile"
                  ? "border-accent bg-accent-subtle text-accent"
                  : "border-card-border text-zinc-600 hover:bg-accent-subtle hover:text-accent dark:text-zinc-400"
              )}
            >
              <UserCircleIcon className="h-8 w-8" />
              {i18n("profile")}
            </Link>
            <Link
              href="/setting"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-4 text-sm font-medium transition-colors",
                pathname === "/setting"
                  ? "border-accent bg-accent-subtle text-accent"
                  : "border-card-border text-zinc-600 hover:bg-accent-subtle hover:text-accent dark:text-zinc-400"
              )}
            >
              <Cog6ToothIcon className="h-8 w-8" />
              {i18n("setting")}
            </Link>
          </div>

          {/* 4. Theme toggle + Language — 2 columns */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={toggleTheme}
              className="cursor-pointer flex items-center justify-center gap-2 rounded-lg border border-card-border px-2 py-3 text-sm font-medium text-zinc-600 hover:bg-accent-subtle hover:text-accent dark:text-zinc-400"
            >
              {isDark ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
              {isDark ? i18nSetting("light") : i18nSetting("dark")}
            </button>
            <div className="flex items-center justify-center gap-1 rounded-lg border border-card-border px-2 py-3">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLocale(l.code)}
                  className={cn(
                    "cursor-pointer rounded-md px-4 py-1 text-sm font-medium transition-colors",
                    locale === l.code
                      ? "bg-accent text-accent-text"
                      : "text-zinc-500 hover:bg-accent-subtle hover:text-accent dark:text-zinc-400"
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Logout — full width */}
          <button
            onClick={() => signOut().then(() => window.location.href = "/login")}
            className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-2 py-3 text-sm font-medium text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
          >
            <ArrowRightStartOnRectangleIcon className="h-6 w-6" />
            {i18nAuth("logout")}
          </button>
        </div>
      )}
    </header>
  );
}
