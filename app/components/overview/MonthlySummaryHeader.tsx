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
    <div className="flex flex-col gap-2 md:gap-4">
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-4 text-center dark:border-zinc-800 dark:bg-zinc-900 md:px-5 md:py-5">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 md:text-sm">{i18n("totalIncome")}</p>
          <p className="mt-1 text-xl font-bold md:text-2xl">
            <CurrencyDisplay amount={totalIncome} className="text-green-600 dark:text-green-400" />
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-4 text-center dark:border-zinc-800 dark:bg-zinc-900 md:px-5 md:py-5">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 md:text-sm">{i18n("totalExpenses")}</p>
          <p className="mt-1 text-xl font-bold md:text-2xl">
            <CurrencyDisplay amount={totalExpenses} className="text-red-600 dark:text-red-400" />
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white px-4 py-4 text-center dark:border-zinc-800 dark:bg-zinc-900 md:px-5 md:py-5">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 md:text-sm">{i18n("netSavings")}</p>
        <p className="mt-1 text-xl font-bold md:text-2xl">
          <CurrencyDisplay
            amount={netSavings}
            className={netSavings >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
          />
        </p>
      </div>
    </div>
  );
}
