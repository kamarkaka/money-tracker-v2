"use client";

import { useEffect, useState, useRef } from "react";

interface SlotNumberProps {
  value: string;
  className?: string;
  duration?: number;
}

const CELL_HEIGHT = 1.15; // em

function SlotDigit({ char, delay, duration }: { char: string; delay: number; duration: number }) {
  const [animate, setAnimate] = useState(false);
  const isDigit = /\d/.test(char);

  useEffect(() => {
    if (!isDigit) return;
    const timer = setTimeout(() => setAnimate(true), delay);
    return () => clearTimeout(timer);
  }, [delay, isDigit]);

  if (!isDigit) {
    return <span>{char}</span>;
  }

  const digit = parseInt(char);
  const strip = Array.from({ length: 10 + digit + 1 }, (_, i) => i % 10);

  return (
    <span
      className="inline-block overflow-hidden align-bottom"
      style={{ height: `${CELL_HEIGHT}em` }}
    >
      <span
        className="flex flex-col"
        style={{
          transform: animate
            ? `translateY(-${(strip.length - 1) * CELL_HEIGHT}em)`
            : "translateY(0)",
          transition: animate
            ? `transform ${duration}ms cubic-bezier(0.25, 0.1, 0.25, 1)`
            : "none",
        }}
      >
        {strip.map((d, i) => (
          <span
            key={i}
            className="text-center"
            style={{ height: `${CELL_HEIGHT}em`, lineHeight: `${CELL_HEIGHT}em` }}
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

export function SlotNumber({ value, className, duration = 1000 }: SlotNumberProps) {
  const chars = value.split("");
  const digitCount = useRef(0);
  digitCount.current = 0;

  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "flex-end", lineHeight: `${CELL_HEIGHT}em` }}
    >
      {chars.map((char, i) => {
        const isDigit = /\d/.test(char);
        const delay = isDigit ? digitCount.current * 60 : 0;
        if (isDigit) digitCount.current++;
        return (
          <SlotDigit
            key={`${i}-${char}`}
            char={char}
            delay={delay}
            duration={duration}
          />
        );
      })}
    </span>
  );
}
