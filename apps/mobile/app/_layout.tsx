import { useEffect, useState, useCallback, useMemo } from "react";
import { useColorScheme, ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { ApiClientContext } from "@money-tracker/hooks";
import { createSettingsApi } from "@money-tracker/api-client";
import { apiClient } from "@/lib/api";
import { ThemeContext, type ThemeSetting } from "@/lib/themeContext";
import { getThemeWithBrand } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { getDatabase } from "@/lib/db";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SubscriptionProvider } from "@/lib/subscription";

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [themeSetting, setThemeSettingState] = useState<ThemeSetting>("system");
  const [locale, setLocale] = useState("en");
  const [isPro, setIsPro] = useState(false);

  const isDark =
    themeSetting === "dark" ||
    (themeSetting === "system" && systemScheme === "dark");
  const theme = getThemeWithBrand(isDark, isPro);

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
          if (settings.mode === "pro") {
            setIsPro(true);
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

  const themeContextValue = useMemo(
    () => ({ theme, themeSetting, isDark, isPro, setThemeSetting, setIsPro }),
    [theme, themeSetting, isDark, isPro, setThemeSetting, setIsPro],
  );

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
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeContext.Provider
      value={themeContextValue}
    >
      <I18nProvider initialLocale={locale}>
        <ApiClientContext.Provider value={apiClient}>
          <SubscriptionProvider>
          <ThemeProvider value={{
            ...(isDark ? DarkTheme : DefaultTheme),
            colors: {
              ...(isDark ? DarkTheme : DefaultTheme).colors,
              background: theme.background,
              card: theme.card,
              text: theme.text,
              border: theme.cardBorder,
              primary: theme.accent,
            },
          }}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.card },
              headerTintColor: theme.text,
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
          </ThemeProvider>
          </SubscriptionProvider>
        </ApiClientContext.Provider>
      </I18nProvider>
    </ThemeContext.Provider>
    </GestureHandlerRootView>
  );
}
