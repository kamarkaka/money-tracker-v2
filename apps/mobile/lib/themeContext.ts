import { createContext, useContext } from "react";
import { colors, type ThemeColors } from "./theme";

export type ThemeSetting = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemeColors;
  themeSetting: ThemeSetting;
  isDark: boolean;
  isPro: boolean;
  setThemeSetting: (setting: ThemeSetting) => void;
  setIsPro: (isPro: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: colors.light,
  themeSetting: "system",
  isDark: false,
  isPro: false,
  setThemeSetting: () => {},
  setIsPro: () => {},
});

export function useAppTheme() {
  return useContext(ThemeContext);
}
