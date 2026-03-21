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

const ICON_COLORS: { bg: string; text: string }[] = [
  { bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-600 dark:text-blue-400" },
  { bg: "bg-emerald-100 dark:bg-emerald-900", text: "text-emerald-600 dark:text-emerald-400" },
  { bg: "bg-violet-100 dark:bg-violet-900", text: "text-violet-600 dark:text-violet-400" },
  { bg: "bg-amber-100 dark:bg-amber-900", text: "text-amber-600 dark:text-amber-400" },
  { bg: "bg-rose-100 dark:bg-rose-900", text: "text-rose-600 dark:text-rose-400" },
  { bg: "bg-teal-100 dark:bg-teal-900", text: "text-teal-600 dark:text-teal-400" },
  { bg: "bg-orange-100 dark:bg-orange-900", text: "text-orange-600 dark:text-orange-400" },
  { bg: "bg-indigo-100 dark:bg-indigo-900", text: "text-indigo-600 dark:text-indigo-400" },
  { bg: "bg-pink-100 dark:bg-pink-900", text: "text-pink-600 dark:text-pink-400" },
  { bg: "bg-cyan-100 dark:bg-cyan-900", text: "text-cyan-600 dark:text-cyan-400" },
];

export function getBudgetIconColor(index: number): { bg: string; text: string } {
  return ICON_COLORS[index % ICON_COLORS.length];
}

interface BudgetIconPickerProps {
  selected: string;
  onChange: (icon: string) => void;
}

export function BudgetIconPicker({ selected, onChange }: BudgetIconPickerProps) {
  const [open, setOpen] = useState(false);
  const SelectedIcon = getBudgetIcon(selected);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`cursor-pointer flex h-10 w-10 items-center justify-center rounded-md border transition-colors ${
          selected
            ? "border-accent bg-accent-subtle text-accent"
            : "border-zinc-300 text-zinc-400 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-500"
        }`}
      >
        {SelectedIcon ? <SelectedIcon className="h-5 w-5" /> : <Icons.PlusIcon className="h-5 w-5" />}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 grid max-h-48 w-64 grid-cols-8 gap-1 overflow-y-auto rounded-lg border border-card-border bg-card-bg p-2 shadow-lg">
          {BUDGET_ICONS.map(({ name, icon: Icon }) => (
            <button
              key={name}
              type="button"
              onClick={() => { onChange(name); setOpen(false); }}
              className={`cursor-pointer flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                selected === name
                  ? "bg-accent text-accent-text"
                  : "text-zinc-600 hover:bg-accent-subtle hover:text-accent dark:text-zinc-400"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
