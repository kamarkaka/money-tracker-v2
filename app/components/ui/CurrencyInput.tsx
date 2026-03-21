"use client";

import { useState, useEffect } from "react";

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function CurrencyInput({ value, onChange, className, placeholder = "0.00" }: CurrencyInputProps) {
  // Store raw cents as integer string
  const [cents, setCents] = useState(() => {
    if (!value) return "";
    const num = Math.round(parseFloat(value) * 100);
    return isNaN(num) || num === 0 ? "" : String(num);
  });

  // Sync from external value changes (e.g. reset)
  useEffect(() => {
    if (!value) {
      setCents("");
      return;
    }
    const num = Math.round(parseFloat(value) * 100);
    if (isNaN(num) || num === 0) {
      setCents("");
    } else {
      setCents(String(num));
    }
  }, [value]);

  const formatCents = (c: string): string => {
    if (!c) return "";
    const n = parseInt(c, 10);
    return (n / 100).toFixed(2);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = cents.slice(0, -1);
      setCents(next);
      onChange(next ? formatCents(next) : "");
      return;
    }

    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const next = cents + e.key;
      setCents(next);
      onChange(formatCents(next));
      return;
    }

    // Allow Tab, Enter, etc.
    if (!["Tab", "Enter", "Escape", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const displayValue = cents ? formatCents(cents) : "";

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={displayValue}
      placeholder={placeholder}
      onKeyDown={handleKeyDown}
      onChange={() => {}} // controlled via onKeyDown
      className={className}
    />
  );
}
