import { formatCurrency } from "@/app/lib/utils";
import { SlotNumber } from "@/app/components/ui/SlotNumber";
import { useTranslations } from "next-intl";

interface MonthlySummaryHeaderProps {
  totalIncome: number;
  totalExpenses: number;
}

export function MonthlySummaryHeader({ totalIncome, totalExpenses }: MonthlySummaryHeaderProps) {
  const i18n = useTranslations("overview");
  const netSavings = totalIncome + totalExpenses;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {/* Net Savings — full width on mobile, first col on desktop */}
      <div className={`col-span-2 rounded-lg border px-4 py-5 text-center md:col-span-1 md:px-5 md:py-6 ${
        netSavings >= 0
          ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900"
          : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900"
      }`}>
        <p className={`text-xs font-medium md:text-sm ${
          netSavings >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-400"
        }`}>{i18n("netSavings")}</p>
        <p className="mt-1 flex items-center justify-center text-3xl font-bold md:text-4xl">
          <SlotNumber
            value={formatCurrency(netSavings, "USD", true)}
            className={netSavings >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}
          />
        </p>
      </div>

      {/* Income */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-center dark:border-emerald-800 dark:bg-emerald-900 md:px-5 md:py-6">
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 md:text-sm">{i18n("totalIncome")}</p>
        <p className="mt-1 flex justify-center text-xl font-bold md:text-2xl">
          <SlotNumber value={formatCurrency(totalIncome, "USD", true)} className="text-emerald-600 dark:text-emerald-400" />
        </p>
      </div>

      {/* Expenses */}
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-center dark:border-red-800 dark:bg-red-900 md:px-5 md:py-6">
        <p className="text-xs font-medium text-red-700 dark:text-red-400 md:text-sm">{i18n("totalExpenses")}</p>
        <p className="mt-1 flex justify-center text-xl font-bold md:text-2xl">
          <SlotNumber value={formatCurrency(Math.abs(totalExpenses), "USD", true)} className="text-red-600 dark:text-red-400" />
        </p>
      </div>
    </div>
  );
}
