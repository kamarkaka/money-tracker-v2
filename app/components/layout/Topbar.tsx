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
    { href: "/overview", label: i18n("overview"), icon: ChartBarIcon, color: "text-rose-500", bg: "bg-rose-100 dark:bg-rose-900" },
    { href: "/account", label: i18n("account"), icon: BuildingLibraryIcon, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900" },
    { href: "/transaction", label: i18n("transaction"), icon: ListBulletIcon, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900" },
  ];

  const MENU_ITEMS = [
    { href: "/category", label: i18n("category"), icon: BookmarkIcon, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900" },
    { href: "/budget", label: i18n("budget"), icon: CurrencyDollarIcon, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900" },
    { href: "/rule", label: i18n("rule"), icon: FunnelIcon, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900" },
    { href: "/tag", label: i18n("tag"), icon: TagIcon, color: "text-teal-500", bg: "bg-teal-100 dark:bg-teal-900" },
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
        <div className="border-t border-card-border bg-gradient-to-b from-blue-50 to-white px-4 py-4 dark:from-zinc-900 dark:to-zinc-950 md:hidden">
          <div className="grid grid-cols-4 gap-x-2 gap-y-4">
            {[...NAV_ITEMS, ...MENU_ITEMS,
              { href: "/profile", label: i18n("profile"), icon: UserCircleIcon, color: "text-indigo-500", bg: "bg-indigo-100 dark:bg-indigo-900" },
              { href: "/setting", label: i18n("setting"), icon: Cog6ToothIcon, color: "text-zinc-500", bg: "bg-zinc-100 dark:bg-zinc-800" },
            ].map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm transition-colors",
                    isActive ? item.bg : "bg-white dark:bg-zinc-800"
                  )}>
                    <item.icon className={cn("h-7 w-7", item.color)} />
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    isActive ? item.color : "text-zinc-600 dark:text-zinc-400"
                  )}>{item.label}</span>
                </Link>
              );
            })}
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="flex cursor-pointer flex-col items-center gap-1.5"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm transition-colors dark:bg-zinc-800">
                {isDark ? <SunIcon className="h-7 w-7 text-yellow-500" /> : <MoonIcon className="h-7 w-7 text-violet-500" />}
              </div>
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {isDark ? i18nSetting("light") : i18nSetting("dark")}
              </span>
            </button>
            {/* Language toggle */}
            {LANGS.filter((l) => l.code !== locale).map((l) => (
              <button
                key={l.code}
                onClick={() => setLocale(l.code)}
                className="flex cursor-pointer flex-col items-center gap-1.5"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm transition-colors dark:bg-zinc-800">
                  <LanguageIcon className="h-7 w-7 text-cyan-500" />
                </div>
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{l.label}</span>
              </button>
            ))}
            {/* Logout */}
            <button
              onClick={() => signOut().then(() => window.location.href = "/login")}
              className="flex cursor-pointer flex-col items-center gap-1.5"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm transition-colors dark:bg-zinc-800">
                <ArrowRightStartOnRectangleIcon className="h-7 w-7 text-red-500" />
              </div>
              <span className="text-xs font-medium text-red-500">{i18nAuth("logout")}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
