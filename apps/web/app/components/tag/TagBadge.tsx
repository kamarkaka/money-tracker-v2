"use client";

import { textColorForBg } from "@/app/lib/tag-colors";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface TagBadgeProps {
  name: string;
  color: string;
  onRemove?: () => void;
  className?: string;
}

export function TagBadge({ name, color, onRemove, className = "" }: TagBadgeProps) {
  const textColor = textColorForBg(color);

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${className}`}
      style={{
        backgroundColor: color,
        color: textColor,
        padding: "2px 8px 2px 12px",
        borderRadius: "0 4px 4px 0",
        clipPath: "polygon(6px 0%, 100% 0%, 100% 100%, 6px 100%, 0% 50%)",
      }}
    >
      {name}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="cursor-pointer rounded-full p-0.5 hover:opacity-70"
          style={{ color: textColor }}
        >
          <XMarkIcon className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
