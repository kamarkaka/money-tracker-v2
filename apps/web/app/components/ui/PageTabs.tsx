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
    <div className="flex items-baseline gap-3 md:gap-4">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`transition-colors ${
              isActive
                ? "text-2xl font-bold text-zinc-900 underline decoration-accent decoration-2 underline-offset-6 dark:text-zinc-50 md:text-3xl"
                : "text-lg font-medium text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 md:text-xl"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
