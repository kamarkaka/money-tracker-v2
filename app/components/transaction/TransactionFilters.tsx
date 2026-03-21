"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/app/components/ui/FormField";
import { CurrencyInput } from "@/app/components/ui/CurrencyInput";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

interface Account {
  id: string;
  name: string;
  isHidden?: boolean;
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

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  allLabel,
  noneLabel,
}: {
  label: string;
  options: { id: string; name: string }[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
  allLabel: string;
  noneLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(next);
  };

  const summary = selected.size === 0 || selected.size === options.length
    ? label
    : selected.size === 1
      ? options.find((o) => o.id === [...selected][0])?.name || label
      : `${selected.size} selected`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center justify-between rounded-md border border-zinc-300 px-3 py-2 text-left text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
      >
        <span className={selected.size === 0 ? "text-zinc-500 dark:text-zinc-400" : ""}>
          {summary}
        </span>
        <ChevronDownIcon className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-card-border bg-card-bg shadow-lg">
          <label
            className="flex cursor-pointer items-center gap-2 border-b border-card-border px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent-subtle"
            onClick={(e) => {
              e.preventDefault();
              if (selected.size === options.length) {
                onChange(new Set());
              } else {
                onChange(new Set(options.map((o) => o.id)));
              }
            }}
          >
            <input
              type="checkbox"
              checked={selected.size === options.length}
              readOnly
              className="accent-accent"
            />
            {selected.size === options.length ? noneLabel : allLabel}
          </label>
          {options.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <input
                type="checkbox"
                checked={selected.has(option.id)}
                onChange={() => toggle(option.id)}
                className="accent-zinc-900 dark:accent-zinc-50"
              />
              {option.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
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

  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [accountsInitialized, setAccountsInitialized] = useState(false);

  useEffect(() => {
    if (!accountsInitialized && accounts.length > 0) {
      const nonHidden = accounts.filter((a) => !a.isHidden).map((a) => a.id);
      setSelectedAccounts(new Set(nonHidden));
      setAccountsInitialized(true);
      // Apply the filter so the initial fetch excludes hidden accounts
      const value = nonHidden.join(",");
      const newFilters = { ...filters, accountId: value };
      setFilters(newFilters);
      onFilter(newFilters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, accountsInitialized]);

  const update = (key: keyof FilterValues, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const handleAccountChange = (selected: Set<string>) => {
    setSelectedAccounts(selected);
    const value = [...selected].join(",");
    update("accountId", value);
  };

  const handleCategoryChange = (selected: Set<string>) => {
    setSelectedCategories(selected);
    const value = [...selected].join(",");
    update("categoryId", value);
  };

  const handleClear = () => {
    const defaultAccounts = new Set(accounts.filter((a) => !a.isHidden).map((a) => a.id));
    setSelectedAccounts(defaultAccounts);
    setSelectedCategories(new Set());
    const newFilters: FilterValues = {
      search: "",
      accountId: [...defaultAccounts].join(","),
      categoryId: "",
      startDate: "",
      endDate: "",
      minAmount: "",
      maxAmount: "",
    };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const hasActiveFilters = filters.search || filters.categoryId || filters.startDate || filters.endDate || filters.minAmount || filters.maxAmount;

  const flatCategories = categories
    .filter((c) => !c.parentId)
    .flatMap((c) => [
      { id: c.id, name: c.name },
      ...(c.children?.map((ch) => ({ id: ch.id, name: `${c.name} > ${ch.name}` })) ?? []),
    ]);

  const categoryOptions = [
    { id: "uncategorized", name: i18nOverview("uncategorized") },
    ...flatCategories,
  ];

  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-card-border bg-card-bg p-4 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
      <FormField label={i18n("search")} className="sm:col-span-2">
        <input
          type="text"
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          placeholder={i18n("searchPlaceholder")}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
        />
      </FormField>
      <FormField label={i18n("account")}>
        <MultiSelect
          label={i18n("all")}
          options={accounts}
          selected={selectedAccounts}
          onChange={handleAccountChange}
          allLabel={i18n("all")}
          noneLabel={i18n("none")}
        />
      </FormField>
      <FormField label={i18n("categoryOptional")}>
        <MultiSelect
          label={i18n("all")}
          options={categoryOptions}
          selected={selectedCategories}
          onChange={handleCategoryChange}
          allLabel={i18n("all")}
          noneLabel={i18n("none")}
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:gap-4">
        <FormField label={i18n("fromDate")}>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => update("startDate", e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
          />
        </FormField>
        <FormField label={i18n("toDate")}>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => update("endDate", e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
          />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:gap-4">
        <FormField label={i18n("minAmount")}>
          <CurrencyInput
            value={filters.minAmount}
            onChange={(v) => update("minAmount", v)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
          />
        </FormField>
        <FormField label={i18n("maxAmount")}>
          <CurrencyInput
            value={filters.maxAmount}
            onChange={(v) => update("maxAmount", v)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50"
          />
        </FormField>
      </div>
      <div className="flex items-end sm:col-span-2 md:col-span-1">
        <button
          onClick={handleClear}
          className="w-full cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 md:w-auto"
        >
          {i18n("clearFilters")}
        </button>
      </div>
    </div>
  );
}
