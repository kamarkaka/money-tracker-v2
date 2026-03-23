"use client";

const STEP_LABELS = [
  "Tour",
  "Categories",
  "Budgets",
  "Accounts",
];

interface TutorialProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function TutorialProgress({ currentStep, totalSteps }: TutorialProgressProps) {
  return (
    <div className="px-8 py-4">
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                i < currentStep
                  ? "bg-green-500 text-white"
                  : i === currentStep
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
              }`}
            >
              {i < currentStep ? "✓" : i + 1}
            </div>
            {i < totalSteps - 1 && (
              <div
                className={`h-0.5 w-6 transition-colors ${
                  i < currentStep ? "bg-green-500" : "bg-zinc-200 dark:bg-zinc-700"
                }`}
              />
            )}
          </div>
        ))}
        <span className="ml-3 text-xs text-zinc-500 dark:text-zinc-400">
          {STEP_LABELS[currentStep]}
        </span>
      </div>
    </div>
  );
}
