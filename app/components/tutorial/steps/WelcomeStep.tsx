"use client";

import Image from "next/image";

interface WelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export function WelcomeStep({ onNext, onSkip }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-12">
      <div className="animate-scale-in">
        <Image
          src="/logo.png"
          alt="App Logo"
          width={128}
          height={128}
          className="rounded-lg shadow-lg"
        />
      </div>

      <h1
        className="animate-fade-in-up mt-8 text-3xl font-bold text-zinc-900 dark:text-zinc-50"
        style={{ animationDelay: "0.3s" }}
      >
        Welcome to Money Tracker 2!
      </h1>

      <p
        className="animate-fade-in-up mt-4 max-w-md text-center text-zinc-600 dark:text-zinc-400"
        style={{ animationDelay: "0.6s" }}
      >
        Let&apos;s get you set up in a few quick steps. We&apos;ll help you create categories,
        set up budgets, and link your bank accounts.
      </p>

      <p
        className="animate-fade-in-up mt-2 text-sm text-zinc-500 dark:text-zinc-500"
        style={{ animationDelay: "0.9s" }}
      >
        You can skip any step or quit the tutorial at any time.
      </p>

      <div
        className="animate-fade-in-up mt-8 flex items-center gap-4"
        style={{ animationDelay: "1.2s" }}
      >
        <button
          onClick={onNext}
          className="cursor-pointer rounded-md bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Let&apos;s Go
        </button>
        <button
          onClick={onSkip}
          className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Skip Tutorial
        </button>
      </div>
    </div>
  );
}
