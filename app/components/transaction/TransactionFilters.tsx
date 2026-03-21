"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { CurrencyInput } from "@/app/components/ui/CurrencyInput";
import {
  MagnifyingGlassIcon,
  BuildingLibraryIcon,
  BookmarkIcon,
  CalendarIcon,
  BanknotesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

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

type ChipType = "account" | "category" | "date" | "amount";

function FilterChip({
  label,
  icon: Icon,
  active,
  color,
  onClick,
  onClear,
}: {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  active: boolean;
  color: { text: string; bg: string; border: string; hover: string };
  onClick: () => void;
  onClear?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? `${color.border} ${color.bg} ${color.text}`
          : `border-card-border bg-card-bg text-zinc-600 ${color.hover} dark:text-zinc-400`
      }`}
    >
      <Icon className={`h-3.5 w-3.5 ${active ? "" : color.text}`} />
      {label}
      {active && onClear && (
        <span
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
        >
          <XMarkIcon className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}

function ChipDropdown({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      // Don't close if clicking inside the dropdown or its parent chip wrapper
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target) && !ref.current.parentElement?.contains(target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div ref={ref} className="fixed left-[5vw] z-50 mt-2 w-[90vw] max-h-64 overflow-y-auto rounded-lg border border-card-border bg-card-bg p-3 shadow-lg md:absolute md:left-0 md:w-64">
      {children}
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
  const [openChip, setOpenChip] = useState<ChipType | null>(null);

  useEffect(() => {
    if (!accountsInitialized && accounts.length > 0) {
      const nonHidden = accounts.filter((a) => !a.isHidden).map((a) => a.id);
      setSelectedAccounts(new Set(nonHidden));
      setAccountsInitialized(true);
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

  const handleAccountChange = (id: string) => {
    const next = new Set(selectedAccounts);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedAccounts(next);
    update("accountId", [...next].join(","));
  };

  const handleAccountAll = () => {
    if (selectedAccounts.size === accounts.length) {
      setSelectedAccounts(new Set());
      update("accountId", "");
    } else {
      const all = new Set(accounts.map((a) => a.id));
      setSelectedAccounts(all);
      update("accountId", [...all].join(","));
    }
  };

  const handleCategoryChange = (id: string) => {
    const next = new Set(selectedCategories);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedCategories(next);
    update("categoryId", [...next].join(","));
  };

  const handleCategoryAll = () => {
    if (selectedCategories.size === categoryOptions.length) {
      setSelectedCategories(new Set());
      update("categoryId", "");
    } else {
      const all = new Set(categoryOptions.map((c) => c.id));
      setSelectedCategories(all);
      update("categoryId", [...all].join(","));
    }
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
    setOpenChip(null);
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

  // Chip labels
  const accountLabel = selectedAccounts.size === 0 || selectedAccounts.size === accounts.length
    ? i18n("account")
    : selectedAccounts.size === 1
      ? accounts.find((a) => a.id === [...selectedAccounts][0])?.name || i18n("account")
      : `${selectedAccounts.size} ${i18n("accounts")}`;

  const categoryLabel = selectedCategories.size === 0
    ? i18n("categoryOptional")
    : selectedCategories.size === 1
      ? categoryOptions.find((c) => c.id === [...selectedCategories][0])?.name || i18n("categoryOptional")
      : `${selectedCategories.size} ${i18n("categories")}`;

  const dateActive = !!(filters.startDate || filters.endDate);
  const dateLabel = dateActive
    ? `${filters.startDate || "..."} – ${filters.endDate || "..."}`
    : i18n("date");

  const amountActive = !!(filters.minAmount || filters.maxAmount);
  const amountLabel = amountActive
    ? `$${filters.minAmount || "0"} – $${filters.maxAmount || "∞"}`
    : i18n("amount");

  const accountActive = selectedAccounts.size > 0 && selectedAccounts.size < accounts.length;
  const categoryActive = selectedCategories.size > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Search bar */}
      <div className="flex h-10 items-center gap-2 rounded-lg border border-card-border bg-input-bg px-3 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
        <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          placeholder={i18n("searchPlaceholder")}
          className="h-full w-full border-0 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none dark:text-zinc-50 dark:placeholder-zinc-500"
        />
        {filters.search && (
          <button
            onClick={() => update("search", "")}
            className="cursor-pointer rounded-full p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="relative flex flex-wrap items-center gap-2">
        {/* Account chip */}
        <div className="relative">
          <FilterChip
            label={accountLabel}
            icon={BuildingLibraryIcon}
            active={accountActive}
            color={{ text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900", border: "border-blue-300 dark:border-blue-700", hover: "hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400" }}
            onClick={() => setOpenChip(openChip === "account" ? null : "account")}
            onClear={accountActive ? () => {
              const all = new Set(accounts.map((a) => a.id));
              setSelectedAccounts(all);
              update("accountId", [...all].join(","));
            } : undefined}
          />
          <ChipDropdown open={openChip === "account"} onClose={() => setOpenChip(null)}>
            <label
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-accent hover:bg-accent-subtle"
              onClick={(e) => { e.preventDefault(); handleAccountAll(); }}
            >
              <input type="checkbox" checked={selectedAccounts.size === accounts.length} readOnly className="accent-accent" />
              {selectedAccounts.size === accounts.length ? i18n("none") : i18n("all")}
            </label>
            <div className="my-1 border-t border-card-border" />
            {accounts.map((a) => (
              <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700">
                <input type="checkbox" checked={selectedAccounts.has(a.id)} onChange={() => handleAccountChange(a.id)} className="accent-zinc-900 dark:accent-zinc-50" />
                {a.name}
              </label>
            ))}
          </ChipDropdown>
        </div>

        {/* Category chip */}
        <div className="relative">
          <FilterChip
            label={categoryLabel}
            icon={BookmarkIcon}
            active={categoryActive}
            color={{ text: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900", border: "border-purple-300 dark:border-purple-700", hover: "hover:border-purple-300 hover:text-purple-600 dark:hover:text-purple-400" }}
            onClick={() => setOpenChip(openChip === "category" ? null : "category")}
            onClear={categoryActive ? () => {
              setSelectedCategories(new Set());
              update("categoryId", "");
            } : undefined}
          />
          <ChipDropdown open={openChip === "category"} onClose={() => setOpenChip(null)}>
            <label
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-accent hover:bg-accent-subtle"
              onClick={(e) => { e.preventDefault(); handleCategoryAll(); }}
            >
              <input type="checkbox" checked={selectedCategories.size === categoryOptions.length} readOnly className="accent-accent" />
              {selectedCategories.size === categoryOptions.length ? i18n("none") : i18n("all")}
            </label>
            <div className="my-1 border-t border-card-border" />
            {categoryOptions.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700">
                <input type="checkbox" checked={selectedCategories.has(c.id)} onChange={() => handleCategoryChange(c.id)} className="accent-zinc-900 dark:accent-zinc-50" />
                {c.name}
              </label>
            ))}
          </ChipDropdown>
        </div>

        {/* Date chip */}
        <div className="relative">
          <FilterChip
            label={dateLabel}
            icon={CalendarIcon}
            active={dateActive}
            color={{ text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900", border: "border-amber-300 dark:border-amber-700", hover: "hover:border-amber-300 hover:text-amber-600 dark:hover:text-amber-400" }}
            onClick={() => setOpenChip(openChip === "date" ? null : "date")}
            onClear={dateActive ? () => {
              update("startDate", "");
              update("endDate", "");
            } : undefined}
          />
          <ChipDropdown open={openChip === "date"} onClose={() => setOpenChip(null)}>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">{i18n("fromDate")}</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                  className="w-full rounded-md border border-card-border bg-input-bg px-3 py-2 text-sm text-zinc-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:text-zinc-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">{i18n("toDate")}</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => update("endDate", e.target.value)}
                  className="w-full rounded-md border border-card-border bg-input-bg px-3 py-2 text-sm text-zinc-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:text-zinc-50"
                />
              </div>
            </div>
          </ChipDropdown>
        </div>

        {/* Amount chip */}
        <div className="relative">
          <FilterChip
            label={amountLabel}
            icon={BanknotesIcon}
            active={amountActive}
            color={{ text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900", border: "border-emerald-300 dark:border-emerald-700", hover: "hover:border-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-400" }}
            onClick={() => setOpenChip(openChip === "amount" ? null : "amount")}
            onClear={amountActive ? () => {
              update("minAmount", "");
              update("maxAmount", "");
            } : undefined}
          />
          <ChipDropdown open={openChip === "amount"} onClose={() => setOpenChip(null)}>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">{i18n("minAmount")}</label>
                <CurrencyInput
                  value={filters.minAmount}
                  onChange={(v) => update("minAmount", v)}
                  className="w-full rounded-md border border-card-border bg-input-bg px-3 py-2 text-sm text-zinc-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:text-zinc-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">{i18n("maxAmount")}</label>
                <CurrencyInput
                  value={filters.maxAmount}
                  onChange={(v) => update("maxAmount", v)}
                  className="w-full rounded-md border border-card-border bg-input-bg px-3 py-2 text-sm text-zinc-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:text-zinc-50"
                />
              </div>
            </div>
          </ChipDropdown>
        </div>

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="cursor-pointer whitespace-nowrap text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            {i18n("clearFilters")}
          </button>
        )}
      </div>
    </div>
  );
}
