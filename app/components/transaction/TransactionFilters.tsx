"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/app/components/ui/FormField";

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

interface TransactionFiltersProps {
  accounts: Account[];
  categories: Category[];
  onFilter: (filters: FilterValues) => void;
}

export interface FilterValues {
  search: string;
  accountId: string;
  categoryId: string;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
}

export function TransactionFilters({
  accounts,
  categories,
  onFilter,
}: TransactionFiltersProps) {
  const i18n = useTranslations("transaction");
  const i18nOverview = useTranslations("overview");
  const [filters, setFilters] = useState<FilterValues>({
    search: "",
    accountId: "",
    categoryId: "",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
  });

  const update = (key: keyof FilterValues, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const flatCategories = categories
    .filter((c) => !c.parentId)
    .flatMap((c) => [
      { id: c.id, name: c.name },
      ...(c.children?.map((ch) => ({ id: ch.id, name: `${c.name} > ${ch.name}` })) ?? []),
    ]);

  return (
    <div className="grid grid-cols-2 gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-4">
      <FormField label={i18n("search")} className="col-span-2">
        <input
          type="text"
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          placeholder={i18n("searchPlaceholder")}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
        />
      </FormField>
      <FormField label={i18n("account")}>
        <select
          value={filters.accountId}
          onChange={(e) => update("accountId", e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
        >
          <option value="">{i18n("all")}</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </FormField>
      <FormField label={i18n("categoryOptional")}>
        <select
          value={filters.categoryId}
          onChange={(e) => update("categoryId", e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
        >
          <option value="">{i18n("all")}</option>
          <option value="uncategorized">{i18nOverview("uncategorized")}</option>
          {flatCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </FormField>
      <FormField label={i18n("fromDate")}>
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => update("startDate", e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
        />
      </FormField>
      <FormField label={i18n("toDate")}>
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => update("endDate", e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
        />
      </FormField>
      <FormField label={i18n("minAmount")}>
        <input
          type="number"
          step="0.01"
          value={filters.minAmount}
          onChange={(e) => update("minAmount", e.target.value)}
          placeholder="0.00"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
        />
      </FormField>
      <FormField label={i18n("maxAmount")}>
        <input
          type="number"
          step="0.01"
          value={filters.maxAmount}
          onChange={(e) => update("maxAmount", e.target.value)}
          placeholder="0.00"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
        />
      </FormField>
    </div>
  );
}
