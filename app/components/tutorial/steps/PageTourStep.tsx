"use client";

import { useState } from "react";
import {
  TagIcon,
  CurrencyDollarIcon,
  BuildingLibraryIcon,
  ListBulletIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

const PAGES = [
  {
    name: "Category",
    icon: TagIcon,
    color: "text-purple-500",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    points: [
      "Organize your transactions into categories like Groceries, Rent, or Entertainment.",
      "Create subcategories for finer tracking (e.g., Food & Dining → Restaurants).",
      "Categories help you understand where your money goes.",
    ],
  },
  {
    name: "Budget",
    icon: CurrencyDollarIcon,
    color: "text-green-500",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    points: [
      "Create budget buckets with monthly spending limits.",
      "Assign categories to each bucket to track spending against your goals.",
      "See at a glance whether you're on track or overspending.",
    ],
  },
  {
    name: "Account",
    icon: BuildingLibraryIcon,
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    points: [
      "Link your bank accounts to automatically import transactions.",
      "View all your accounts and balances in one place.",
      "Track your net worth across all linked institutions.",
    ],
  },
  {
    name: "Transaction",
    icon: ListBulletIcon,
    color: "text-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    points: [
      "See all your transactions in one searchable list.",
      "Filter by date, account, category, or amount.",
      "Assign categories to transactions to keep things organized.",
    ],
  },
  {
    name: "Overview",
    icon: ChartBarIcon,
    color: "text-rose-500",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    points: [
      "Your monthly dashboard — the home base of Money Tracker.",
      "See total income vs. expenses at a glance.",
      "View spending breakdown by budget bucket and quickly categorize transactions.",
    ],
  },
];

interface PageTourStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export function PageTourStep({ onNext, onSkip }: PageTourStepProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const page = PAGES[pageIndex];
  const Icon = page.icon;

  return (
    <div className="flex flex-col items-center px-8 py-8">
      <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        A Quick Tour
      </h2>

      <div key={pageIndex} className="animate-fade-in w-full max-w-lg">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-4 flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${page.bgColor}`}>
              <Icon className={`h-5 w-5 ${page.color}`} />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {page.name}
            </h3>
            <span className="ml-auto text-sm text-zinc-400">
              {pageIndex + 1} / {PAGES.length}
            </span>
          </div>

          <ul className="space-y-3">
            {page.points.map((point, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="mt-6 flex items-center gap-2">
        {PAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setPageIndex(i)}
            className={`h-2 w-2 cursor-pointer rounded-full transition-colors ${
              i === pageIndex
                ? "bg-zinc-900 dark:bg-zinc-50"
                : "bg-zinc-300 dark:bg-zinc-600"
            }`}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        {pageIndex > 0 && (
          <button
            onClick={() => setPageIndex(pageIndex - 1)}
            className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Back
          </button>
        )}
        {pageIndex < PAGES.length - 1 ? (
          <button
            onClick={() => setPageIndex(pageIndex + 1)}
            className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Next
          </button>
        ) : (
          <button
            onClick={onNext}
            className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Continue
          </button>
        )}
        <button
          onClick={onSkip}
          className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
