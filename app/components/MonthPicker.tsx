"use client";

import { useState, useRef } from "react";
import { useLocale } from "@/app/components/LocaleProvider";

interface MonthPickerProps {
  year: number;
  month: number; // 0-indexed
  onChange: (year: number, month: number) => void;
}

function getShortMonths(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { month: "short" });
  return Array.from({ length: 12 }, (_, i) =>
    formatter.format(new Date(2000, i, 1))
  );
}

function addMonths(y: number, m: number, delta: number): { y: number; m: number } {
  let newM = m + delta;
  let newY = y;
  while (newM > 11) {
    newM -= 12;
    newY += 1;
  }
  while (newM < 0) {
    newM += 12;
    newY -= 1;
  }
  return { y: newY, m: newM };
}

export function MonthPicker({ year, month, onChange }: MonthPickerProps) {
  const { locale } = useLocale();
  const shortMonths = getShortMonths(locale);

  const now = new Date();
  const [anchorEnd, setAnchorEnd] = useState({ y: now.getFullYear(), m: now.getMonth() });

  // Touch swipe tracking
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setAnchorEnd((prev) => addMonths(prev.y, prev.m, -1));
      } else {
        setAnchorEnd((prev) => addMonths(prev.y, prev.m, 1));
      }
    }
    touchStartX.current = null;
  };

  // Build 12 months ending at anchorEnd, latest first
  const months: { y: number; m: number }[] = [];
  for (let i = 0; i < 12; i++) {
    months.push(addMonths(anchorEnd.y, anchorEnd.m, -i));
  }

  const goLeft = () => {
    setAnchorEnd((prev) => addMonths(prev.y, prev.m, -1));
  };

  const goRight = () => {
    setAnchorEnd((prev) => addMonths(prev.y, prev.m, 1));
  };

  const labeledYears = new Set<number>();

  const arrowClass =
    "cursor-pointer rounded-md border border-zinc-300 p-2 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800";

  return (
    <div className="flex items-center gap-2">
      {/* Arrow buttons — desktop only */}
      <button onClick={goLeft} className={`${arrowClass} hidden md:block`}>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div
        className="flex items-center gap-1 overflow-x-auto scrollbar-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {months.map(({ y, m }) => {
          const isSelected = y === year && m === month;
          const showYear = !labeledYears.has(y);
          if (showYear) labeledYears.add(y);

          return (
            <button
              key={`${y}-${m}`}
              onClick={() => onChange(y, m)}
              className={`cursor-pointer shrink-0 rounded-md px-3 py-3 text-sm font-medium transition-colors md:px-3 md:py-1.5 ${
                isSelected
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {shortMonths[m]}
              {showYear && <span className="ml-1 text-xs opacity-60">{y}</span>}
            </button>
          );
        })}
      </div>
      <button onClick={goRight} className={`${arrowClass} hidden md:block`}>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
