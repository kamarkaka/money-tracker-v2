import { formatCurrency } from "@/app/lib/utils";

interface CurrencyDisplayProps {
  amount: number | string;
  currency?: string;
  className?: string;
}

export function CurrencyDisplay({
  amount,
  currency = "USD",
  className,
}: CurrencyDisplayProps) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const isZero = num === 0;
  const isNegative = num < 0;

  const defaultColor = isZero
    ? "text-zinc-400 dark:text-zinc-500"
    : isNegative
      ? "text-red-600 dark:text-red-400"
      : "text-green-600 dark:text-green-400";

  return (
    <span className={className ?? defaultColor}>
      {isZero ? "$0.00" : formatCurrency(num, currency)}
    </span>
  );
}
