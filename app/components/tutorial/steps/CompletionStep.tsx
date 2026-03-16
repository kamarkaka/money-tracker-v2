"use client";

import { CheckCircleIcon } from "@heroicons/react/24/solid";

interface CompletionStepProps {
  categoriesCreated: number;
  budgetsCreated: number;
  accountsLinked: number;
  onFinish: () => void;
}

export function CompletionStep({
  categoriesCreated,
  budgetsCreated,
  accountsLinked,
  onFinish,
}: CompletionStepProps) {
  const hasSetup = categoriesCreated > 0 || budgetsCreated > 0 || accountsLinked > 0;

  return (
    <div className="flex flex-col items-center px-8 py-12">
      <div className="animate-scale-in">
        <CheckCircleIcon className="h-20 w-20 text-green-500" />
      </div>

      <h1
        className="animate-fade-in-up mt-6 text-3xl font-bold text-zinc-900 dark:text-zinc-50"
        style={{ animationDelay: "0.3s" }}
      >
        You&apos;re All Set!
      </h1>

      <p
        className="animate-fade-in-up mt-3 text-center text-zinc-600 dark:text-zinc-400"
        style={{ animationDelay: "0.6s" }}
      >
        {hasSetup
          ? "Great job setting up your account. Here's a summary:"
          : "You can set up categories, budgets, and link accounts anytime from the dashboard."}
      </p>

      {hasSetup && (
        <div
          className="animate-fade-in-up mt-5 flex gap-6"
          style={{ animationDelay: "0.9s" }}
        >
          {categoriesCreated > 0 && (
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {categoriesCreated}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {categoriesCreated === 1 ? "Category" : "Categories"}
              </span>
            </div>
          )}
          {budgetsCreated > 0 && (
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {budgetsCreated}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {budgetsCreated === 1 ? "Budget" : "Budgets"}
              </span>
            </div>
          )}
          {accountsLinked > 0 && (
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {accountsLinked}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {accountsLinked === 1 ? "Account" : "Accounts"}
              </span>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onFinish}
        className="animate-fade-in-up mt-8 cursor-pointer rounded-md bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        style={{ animationDelay: hasSetup ? "1.2s" : "0.9s" }}
      >
        Go to Overview
      </button>
    </div>
  );
}
