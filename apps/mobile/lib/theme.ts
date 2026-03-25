export const colors = {
  light: {
    background: "#f8fafc",
    card: "#ffffff",
    cardBorder: "#e2e8f0",
    text: "#171717",
    textSecondary: "#71717a",
    accent: "#2563eb",
    accentText: "#ffffff",
    income: "#059669",
    expense: "#dc2626",
    inputBg: "#ffffff",
    brand: "#10b981",
    brandText: "#ffffff",
    incomeBg: "#dcfce7",
    expenseBg: "#fee2e2",
    successBg: "#ecfdf5",
    successText: "#047857",
    danger: "#ef4444",
    dangerBg: "#fef2f2",
    gradientStart: "#ecfdf5",
    shadow: "#000000",
    backdrop: "rgba(0,0,0,0.4)",
    scrollIndicator: "rgba(0,0,0,0.15)",
  },
  dark: {
    background: "#0f172a",
    card: "#1e293b",
    cardBorder: "#334155",
    text: "#f4f4f5",
    textSecondary: "#a1a1aa",
    accent: "#3b82f6",
    accentText: "#ffffff",
    income: "#34d399",
    expense: "#f87171",
    inputBg: "#162032",
    brand: "#10b981",
    brandText: "#ffffff",
    incomeBg: "#064e3b",
    expenseBg: "#4c1d1d",
    successBg: "#064e3b",
    successText: "#6ee7b7",
    danger: "#ef4444",
    dangerBg: "#4c1d1d",
    gradientStart: "#064e3b",
    shadow: "#000000",
    backdrop: "rgba(0,0,0,0.4)",
    scrollIndicator: "rgba(255,255,255,0.5)",
  },
};

export type ThemeColors = typeof colors.light;

export function getThemeWithBrand(isDark: boolean, isPro: boolean): ThemeColors {
  const base = colors[isDark ? "dark" : "light"];
  if (!isPro) return base;
  return {
    ...base,
    brand: isDark ? "#3b82f6" : "#2563eb",
    gradientStart: isDark ? "#1e3a5f" : "#eff6ff",
  };
}
