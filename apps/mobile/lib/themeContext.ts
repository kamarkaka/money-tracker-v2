import { createContext, useContext } from "react";
import { colors, type ThemeColors } from "./theme";

export type ThemeSetting = "light" | "dark" | "system";

export const DEFAULT_TAB_CONFIG = ["overview", "transactions", "budgets", "accounts"];

interface ThemeContextValue {
  theme: ThemeColors;
  themeSetting: ThemeSetting;
  isDark: boolean;
  isPro: boolean;
  devMode: boolean;
  tabConfig: string[];
  fireworksEnabled: boolean;
  showTutorial: (variant: "casual" | "pro") => void;
  setThemeSetting: (setting: ThemeSetting) => void;
  setIsPro: (isPro: boolean) => void;
  setDevMode: (on: boolean) => void;
  setDevIsPro: (isPro: boolean) => void;
  setTabConfig: (tabs: string[]) => void;
  setFireworksEnabled: (on: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: colors.light,
  themeSetting: "system",
  isDark: false,
  isPro: false,
  devMode: false,
  tabConfig: DEFAULT_TAB_CONFIG,
  fireworksEnabled: true,
  showTutorial: () => {},
  setThemeSetting: () => {},
  setIsPro: () => {},
  setDevMode: () => {},
  setDevIsPro: () => {},
  setTabConfig: () => {},
  setFireworksEnabled: () => {},
});

export function useAppTheme() {
  return useContext(ThemeContext);
}
