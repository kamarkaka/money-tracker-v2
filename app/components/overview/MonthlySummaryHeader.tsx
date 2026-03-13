import { CurrencyDisplay } from "@/app/components/ui/CurrencyDisplay";

interface MonthlySummaryHeaderProps {
  totalIncome: number;
  totalExpenses: number;
}

export function MonthlySummaryHeader({ totalIncome, totalExpenses }: MonthlySummaryHeaderProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Income</p>
        <p className="mt-1 text-2xl font-bold">
          <CurrencyDisplay amount={totalIncome} className="text-green-600 dark:text-green-400" />
        </p>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Expenses</p>
        <p className="mt-1 text-2xl font-bold">
          <CurrencyDisplay amount={totalExpenses} className="text-red-600 dark:text-red-400" />
        </p>
      </div>
    </div>
  );
}
