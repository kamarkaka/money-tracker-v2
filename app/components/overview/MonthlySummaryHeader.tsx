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
    <div className="card-hover rounded-lg bg-accent px-5 py-5 text-accent-text md:px-6 md:py-6">
      {/* Net Savings — big and prominent */}
      <div className="text-center">
        <p className="text-xs font-medium opacity-80 md:text-sm">{i18n("netSavings")}</p>
        <p className="mt-1 flex items-center justify-center text-3xl font-bold md:text-4xl">
          <SlotNumber value={formatCurrency(netSavings, "USD", true)} className="text-white" />
        </p>
      </div>

      {/* Income & Expenses — smaller, side by side */}
      <div className="mt-4 flex">
        <div className="flex-1 text-center">
          <p className="text-xs font-medium opacity-80">{i18n("totalIncome")}</p>
          <p className="mt-1 flex justify-center text-lg font-semibold md:text-xl">
            <SlotNumber value={formatCurrency(totalIncome, "USD", true)} className="text-white" />
          </p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-xs font-medium opacity-80">{i18n("totalExpenses")}</p>
          <p className="mt-1 flex justify-center text-lg font-semibold md:text-xl">
            <SlotNumber value={formatCurrency(Math.abs(totalExpenses), "USD", true)} className="text-white" />
          </p>
        </div>
      </div>
    </div>
  );
}
