"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export function PageTabs() {
  const pathname = usePathname();
  const i18n = useTranslations("nav");

  const tabs = [
    { href: "/overview", label: i18n("overview") },
    { href: "/account", label: i18n("account") },
    { href: "/transaction", label: i18n("transaction") },
  ];

  return (
    <div className="flex gap-1">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-4 py-2 text-lg font-bold transition-colors md:text-2xl ${
              isActive
                ? "bg-accent text-accent-text"
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
