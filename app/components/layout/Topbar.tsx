"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/app/lib/utils";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

const NAV_ITEMS = [
  { href: "/overview", label: "Overview" },
  { href: "/category", label: "Category" },
  { href: "/budget", label: "Budget" },
  { href: "/account", label: "Account" },
  { href: "/transaction", label: "Transaction" },
];

export function Topbar({ userName }: { userName?: string | null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

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
                  "cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {userName && (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex cursor-pointer items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Welcome, {userName}
                <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-40 rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="cursor-pointer block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/setting"
                    onClick={() => setMenuOpen(false)}
                    className="cursor-pointer block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    Setting
                  </Link>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => signOut({ redirectTo: "/login" })}
            className="cursor-pointer rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
