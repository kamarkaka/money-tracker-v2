"use client";

import { useState } from "react";
import * as Icons from "@heroicons/react/24/outline";

export const BUDGET_ICONS: { name: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { name: "HomeIcon", icon: Icons.HomeIcon },
  { name: "ShoppingCartIcon", icon: Icons.ShoppingCartIcon },
  { name: "ShoppingBagIcon", icon: Icons.ShoppingBagIcon },
  { name: "TruckIcon", icon: Icons.TruckIcon },
  { name: "BoltIcon", icon: Icons.BoltIcon },
  { name: "WifiIcon", icon: Icons.WifiIcon },
  { name: "DevicePhoneMobileIcon", icon: Icons.DevicePhoneMobileIcon },
  { name: "FilmIcon", icon: Icons.FilmIcon },
  { name: "MusicalNoteIcon", icon: Icons.MusicalNoteIcon },
  { name: "TvIcon", icon: Icons.TvIcon },
  { name: "HeartIcon", icon: Icons.HeartIcon },
  { name: "AcademicCapIcon", icon: Icons.AcademicCapIcon },
  { name: "BookOpenIcon", icon: Icons.BookOpenIcon },
  { name: "BriefcaseIcon", icon: Icons.BriefcaseIcon },
  { name: "BanknotesIcon", icon: Icons.BanknotesIcon },
  { name: "CreditCardIcon", icon: Icons.CreditCardIcon },
  { name: "GiftIcon", icon: Icons.GiftIcon },
  { name: "CakeIcon", icon: Icons.CakeIcon },
  { name: "SparklesIcon", icon: Icons.SparklesIcon },
  { name: "FireIcon", icon: Icons.FireIcon },
  { name: "WrenchScrewdriverIcon", icon: Icons.WrenchScrewdriverIcon },
  { name: "PaintBrushIcon", icon: Icons.PaintBrushIcon },
  { name: "ScissorsIcon", icon: Icons.ScissorsIcon },
  { name: "GlobeAltIcon", icon: Icons.GlobeAltIcon },
  { name: "PaperAirplaneIcon", icon: Icons.PaperAirplaneIcon },
  { name: "MapIcon", icon: Icons.MapIcon },
  { name: "SunIcon", icon: Icons.SunIcon },
  { name: "StarIcon", icon: Icons.StarIcon },
  { name: "UserGroupIcon", icon: Icons.UserGroupIcon },
  { name: "HandThumbUpIcon", icon: Icons.HandThumbUpIcon },
  { name: "BuildingStorefrontIcon", icon: Icons.BuildingStorefrontIcon },
  { name: "BuildingOfficeIcon", icon: Icons.BuildingOfficeIcon },
  { name: "KeyIcon", icon: Icons.KeyIcon },
  { name: "TicketIcon", icon: Icons.TicketIcon },
  { name: "MapPinIcon", icon: Icons.MapPinIcon },
  { name: "RocketLaunchIcon", icon: Icons.RocketLaunchIcon },
  { name: "BeakerIcon", icon: Icons.BeakerIcon },
  { name: "CameraIcon", icon: Icons.CameraIcon },
  { name: "TrophyIcon", icon: Icons.TrophyIcon },
  { name: "LifebuoyIcon", icon: Icons.LifebuoyIcon },
];

const ICON_MAP = new Map(BUDGET_ICONS.map((i) => [i.name, i.icon]));

export function getBudgetIcon(name: string | null | undefined): React.ComponentType<React.SVGProps<SVGSVGElement>> | null {
  if (!name) return null;
  return ICON_MAP.get(name) ?? null;
}

const ICON_COLORS: { bg: string; text: string; solid: string }[] = [
  { bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-600 dark:text-blue-400", solid: "bg-blue-500" },
  { bg: "bg-emerald-100 dark:bg-emerald-900", text: "text-emerald-600 dark:text-emerald-400", solid: "bg-emerald-500" },
  { bg: "bg-violet-100 dark:bg-violet-900", text: "text-violet-600 dark:text-violet-400", solid: "bg-violet-500" },
  { bg: "bg-amber-100 dark:bg-amber-900", text: "text-amber-600 dark:text-amber-400", solid: "bg-amber-500" },
  { bg: "bg-rose-100 dark:bg-rose-900", text: "text-rose-600 dark:text-rose-400", solid: "bg-rose-500" },
  { bg: "bg-teal-100 dark:bg-teal-900", text: "text-teal-600 dark:text-teal-400", solid: "bg-teal-500" },
  { bg: "bg-orange-100 dark:bg-orange-900", text: "text-orange-600 dark:text-orange-400", solid: "bg-orange-500" },
  { bg: "bg-indigo-100 dark:bg-indigo-900", text: "text-indigo-600 dark:text-indigo-400", solid: "bg-indigo-500" },
  { bg: "bg-pink-100 dark:bg-pink-900", text: "text-pink-600 dark:text-pink-400", solid: "bg-pink-500" },
  { bg: "bg-cyan-100 dark:bg-cyan-900", text: "text-cyan-600 dark:text-cyan-400", solid: "bg-cyan-500" },
];

export function getBudgetIconColor(index: number): { bg: string; text: string; solid: string } {
  return ICON_COLORS[index % ICON_COLORS.length];
}

interface BudgetIconPickerProps {
  selected: string;
  onChange: (icon: string) => void;
  size?: "sm" | "lg";
}

export function BudgetIconPicker({ selected, onChange, size = "sm" }: BudgetIconPickerProps) {
  const [open, setOpen] = useState(false);
  const SelectedIcon = getBudgetIcon(selected);

  const isLg = size === "lg";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`cursor-pointer flex items-center justify-center border transition-colors ${
          isLg ? "h-16 w-16 rounded-full" : "h-10 w-10 rounded-md"
        } ${
          selected
            ? "border-accent bg-accent text-white"
            : "border-dashed border-zinc-300 text-zinc-400 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-500"
        }`}
      >
        {SelectedIcon ? <SelectedIcon className={isLg ? "h-8 w-8" : "h-5 w-5"} /> : <Icons.PlusIcon className={isLg ? "h-8 w-8" : "h-5 w-5"} />}
      </button>
      {open && (
        <div className="fixed left-[5vw] z-50 mt-1 grid w-[90vw] grid-cols-8 gap-2 overflow-y-auto rounded-lg border border-card-border bg-card-bg p-3 shadow-lg md:absolute md:left-0 md:w-64 md:max-h-48 md:gap-1 md:p-2">
          {BUDGET_ICONS.map(({ name, icon: Icon }) => (
            <button
              key={name}
              type="button"
              onClick={() => { onChange(name); setOpen(false); }}
              className={`cursor-pointer flex h-12 w-12 items-center justify-center rounded-lg transition-colors md:h-8 md:w-8 ${
                selected === name
                  ? "bg-accent text-accent-text"
                  : "text-zinc-600 hover:bg-accent-subtle hover:text-accent dark:text-zinc-400"
              }`}
            >
              <Icon className="h-6 w-6 md:h-4 md:w-4" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
