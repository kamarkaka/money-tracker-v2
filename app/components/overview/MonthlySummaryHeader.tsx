import { CurrencyDisplay } from "@/app/components/ui/CurrencyDisplay";
import { useTranslations } from "next-intl";

interface MonthlySummaryHeaderProps {
  totalIncome: number;
  totalExpenses: number;
}

export function MonthlySummaryHeader({ totalIncome, totalExpenses }: MonthlySummaryHeaderProps) {
  const i18n = useTranslations("overview");
  const netSavings = totalIncome + totalExpenses;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{i18n("totalIncome")}</p>
        <p className="mt-1 text-2xl font-bold">
          <CurrencyDisplay amount={totalIncome} className="text-green-600 dark:text-green-400" />
        </p>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{i18n("totalExpenses")}</p>
        <p className="mt-1 text-2xl font-bold">
          <CurrencyDisplay amount={totalExpenses} className="text-red-600 dark:text-red-400" />
        </p>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{i18n("netSavings")}</p>
        <p className="mt-1 text-2xl font-bold">
          <CurrencyDisplay
            amount={netSavings}
            className={netSavings >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
          />
        </p>
      </div>
    </div>
  );
}
