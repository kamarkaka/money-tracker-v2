import { useEffect, useState, useCallback } from "react";
import { useColorScheme, ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { ApiClientContext } from "@money-tracker/hooks";
import { createSettingsApi } from "@money-tracker/api-client";
import { apiClient } from "@/lib/api";
import { ThemeContext } from "@/lib/themeContext";
import { colors } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { getDatabase } from "@/lib/db";

type ThemeSetting = "light" | "dark" | "system";

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [themeSetting, setThemeSettingState] = useState<ThemeSetting>("system");
  const [locale, setLocale] = useState("en");

  const isDark =
    themeSetting === "dark" ||
    (themeSetting === "system" && systemScheme === "dark");
  const theme = colors[isDark ? "dark" : "light"];

  // Initialize local DB and load settings
  useEffect(() => {
    (async () => {
      try {
        // Ensure DB is initialized (creates tables + seeds defaults)
        await getDatabase();

        // Load settings from local DB
        try {
          const settingsApi = createSettingsApi(apiClient);
          const settings = await settingsApi.get();
          if (
            settings.theme === "light" ||
            settings.theme === "dark" ||
            settings.theme === "system"
          ) {
            setThemeSettingState(settings.theme);
          }
          if (settings.language) {
            setLocale(settings.language);
          }
        } catch {
          // ignore
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setThemeSetting = useCallback(async (setting: ThemeSetting) => {
    setThemeSettingState(setting);
    try {
      const settingsApi = createSettingsApi(apiClient);
      await settingsApi.update({ theme: setting });
    } catch {
      // ignore
    }
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <ThemeContext.Provider
      value={{ theme, themeSetting, isDark, setThemeSetting }}
    >
      <I18nProvider initialLocale={locale}>
        <ApiClientContext.Provider value={apiClient}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal/transaction-detail"
              options={{ presentation: "modal", headerShown: false }}
            />
            <Stack.Screen
              name="pages/profile"
              options={{ title: "Profile", headerBackTitle: "Back" }}
            />
            <Stack.Screen
              name="pages/settings"
              options={{ title: "Settings", headerBackTitle: "Back" }}
            />
            <Stack.Screen
              name="pages/accounts"
              options={{ title: "Accounts", headerBackTitle: "Back" }}
            />
            <Stack.Screen
              name="pages/categories"
              options={{ title: "Categories", headerBackTitle: "Back" }}
            />
            <Stack.Screen
              name="pages/budgets"
              options={{ title: "Budgets", headerBackTitle: "Back" }}
            />
            <Stack.Screen
              name="pages/rules"
              options={{ title: "Rules", headerBackTitle: "Back" }}
            />
            <Stack.Screen
              name="pages/tags"
              options={{ title: "Tags", headerBackTitle: "Back" }}
            />
            <Stack.Screen
              name="pages/transactions"
              options={{ title: "Transactions", headerBackTitle: "Back" }}
            />
            <Stack.Screen name="index" options={{ headerShown: false }} />
          </Stack>
        </ApiClientContext.Provider>
      </I18nProvider>
    </ThemeContext.Provider>
  );
}
