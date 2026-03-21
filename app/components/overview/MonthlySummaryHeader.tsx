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
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-center dark:border-emerald-800 dark:bg-emerald-950/30 md:px-5 md:py-5">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 md:text-sm">{i18n("totalIncome")}</p>
          <p className="mt-1 text-xl font-bold md:text-2xl">
            <CurrencyDisplay amount={totalIncome} className="text-emerald-600 dark:text-emerald-400" />
          </p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-center dark:border-red-800 dark:bg-red-950/30 md:px-5 md:py-5">
          <p className="text-xs font-medium text-red-700 dark:text-red-400 md:text-sm">{i18n("totalExpenses")}</p>
          <p className="mt-1 text-xl font-bold md:text-2xl">
            <CurrencyDisplay amount={totalExpenses} className="text-red-600 dark:text-red-400" />
          </p>
        </div>
      </div>
      <div className={`rounded-lg border px-4 py-4 text-center md:px-5 md:py-5 ${
        netSavings >= 0
          ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
          : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
      }`}>
        <p className={`text-xs font-medium md:text-sm ${
          netSavings >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-400"
        }`}>{i18n("netSavings")}</p>
        <p className="mt-1 text-xl font-bold md:text-2xl">
          <CurrencyDisplay
            amount={netSavings}
            className={netSavings >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}
          />
          {netSavings > 0 && <span className="ml-1">🎉</span>}
        </p>
      </div>
    </div>
  );
}
