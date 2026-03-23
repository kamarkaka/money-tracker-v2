"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";

export interface GuideStep {
  target: string;
  title: string;
  description: string;
  position?: "top" | "bottom";
}

interface PageGuideProps {
  steps: GuideStep[];
  onComplete: () => void;
}

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function PageGuide({ steps, onComplete }: PageGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<"top" | "bottom">("bottom");
  const tooltipRef = useRef<HTMLDivElement>(null);
  const i18nc = useTranslations("common");

  const step = steps[currentStep];

  const updatePosition = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const padding = 6;
    // Use viewport coordinates (no scroll offset) since overlay is fixed
    setTargetRect({
      x: rect.x - padding,
      y: rect.y - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });

    // Determine tooltip position
    const spaceBelow = window.innerHeight - rect.bottom;
    const pos = step.position || (spaceBelow > 200 ? "bottom" : "top");
    setTooltipPos(pos);

    // Scroll into view if needed
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [step]);

  useEffect(() => {
    // Retry until element is found (page may still be rendering)
    let attempts = 0;
    const maxAttempts = 20;
    const tryFind = () => {
      attempts++;
      const el = step ? document.querySelector(step.target) : null;
      if (el) {
        updatePosition();
      } else if (attempts < maxAttempts) {
        setTimeout(tryFind, 300);
      }
    };
    const timer = setTimeout(tryFind, 500);
    return () => clearTimeout(timer);
  }, [currentStep, step, updatePosition]);

  useEffect(() => {
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [updatePosition]);

  const handleNext = () => {
    // Find next step that has a visible target
    let next = currentStep + 1;
    while (next < steps.length) {
      const el = document.querySelector(steps[next].target);
      if (el) break;
      next++;
    }
    if (next < steps.length) {
      setCurrentStep(next);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!step || !targetRect) return null;

  const isLast = currentStep === steps.length - 1;

  const tooltipTop = tooltipPos === "bottom"
    ? targetRect.y + targetRect.height + 12
    : targetRect.y - 12;

  const tooltipLeft = Math.max(16, Math.min(targetRect.x, window.innerWidth - 320));
  const targetCenterX = targetRect.x + targetRect.width / 2;
  const arrowLeft = Math.max(20, Math.min(targetCenterX - tooltipLeft, 300 - 20));

  return (
    <div className="fixed inset-0 z-[55]">
      {/* SVG overlay with spotlight cutout */}
      <svg
        className="fixed inset-0 h-full w-full"
        style={{ zIndex: 55 }}
      >
        <defs>
          <mask id="guide-spotlight">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.x}
              y={targetRect.y}
              width={targetRect.width}
              height={targetRect.height}
              rx="8"
              fill="black"
              className="transition-all duration-300 ease-out"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#guide-spotlight)"
          onClick={handleSkip}
        />
      </svg>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed left-4 right-4 z-[56] mx-auto max-w-xs rounded-xl border border-card-border bg-card-bg p-4 shadow-xl md:left-auto md:right-auto"
        style={{
          top: tooltipPos === "bottom" ? tooltipTop : undefined,
          bottom: tooltipPos === "top" ? window.innerHeight - tooltipTop : undefined,
          left: tooltipLeft,
          transition: "all 0.3s ease",
        }}
      >
        {/* Arrow */}
        <div
          className={`absolute h-3 w-3 rotate-45 border-card-border bg-card-bg ${
            tooltipPos === "bottom"
              ? "-top-1.5 border-l border-t"
              : "-bottom-1.5 border-b border-r"
          }`}
          style={{ left: arrowLeft }}
        />

        <h3 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {step.title}
        </h3>
        <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">
          {step.description}
        </p>

        <div className="flex items-center justify-between">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === currentStep ? "bg-accent" : i < currentStep ? "bg-emerald-400" : "bg-zinc-300 dark:bg-zinc-600"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSkip}
              className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              {i18nc("skip")}
            </button>
            <button
              onClick={handleNext}
              className="cursor-pointer rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-text hover:bg-accent-hover"
            >
              {isLast ? i18nc("done") : i18nc("next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
