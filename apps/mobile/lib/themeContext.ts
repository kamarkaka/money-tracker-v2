import { createContext, useContext } from "react";
import { colors, type ThemeColors } from "./theme";

type ThemeSetting = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemeColors;
  themeSetting: ThemeSetting;
  isDark: boolean;
  setThemeSetting: (setting: ThemeSetting) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: colors.light,
  themeSetting: "system",
  isDark: false,
  setThemeSetting: () => {},
});

export function useAppTheme() {
  return useContext(ThemeContext);
}
