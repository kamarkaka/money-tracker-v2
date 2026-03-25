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
  setThemeSetting: (setting: ThemeSetting) => void;
  setIsPro: (isPro: boolean) => void;
  setDevMode: (on: boolean) => void;
  setDevIsPro: (isPro: boolean) => void;
  setTabConfig: (tabs: string[]) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: colors.light,
  themeSetting: "system",
  isDark: false,
  isPro: false,
  devMode: false,
  tabConfig: DEFAULT_TAB_CONFIG,
  setThemeSetting: () => {},
  setIsPro: () => {},
  setDevMode: () => {},
  setDevIsPro: () => {},
  setTabConfig: () => {},
});

export function useAppTheme() {
  return useContext(ThemeContext);
}
