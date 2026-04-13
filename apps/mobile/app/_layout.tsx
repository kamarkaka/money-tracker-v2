import { createContext, useEffect, useState, useCallback, useMemo } from "react";
import { useColorScheme, ActivityIndicator, View } from "react-native";
import { getLocales } from "expo-localization";
import { Stack } from "expo-router";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import type { ApiClient } from "@money-tracker/api-client";

const ApiClientContext = createContext<ApiClient | null>(null);
import { createSettingsApi } from "@money-tracker/api-client";
import { apiClient } from "@/lib/api";
import { ThemeContext, type ThemeSetting, DEFAULT_TAB_CONFIG } from "@/lib/themeContext";
import { getThemeWithBrand } from "@/lib/theme";
import { I18nProvider, t } from "@/lib/i18n";
import { getDatabase } from "@/lib/db";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SubscriptionProvider } from "@/lib/subscription";
import { Tutorial } from "@/components/Tutorial";

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [themeSetting, setThemeSettingState] = useState<ThemeSetting>("system");
  const [locale, setLocale] = useState(() => {
    const systemLang = getLocales()[0]?.languageCode || "en";
    return systemLang === "zh" ? "zh" : "en";
  });
  const [subIsPro, setSubIsPro] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [devIsPro, setDevIsPro] = useState(false);
  const isPro = devMode ? devIsPro : subIsPro;
  const [tabConfig, setTabConfigState] = useState<string[]>(DEFAULT_TAB_CONFIG);
  const [fireworksEnabled, setFireworksEnabledState] = useState(true);
  const [tutorialVisible, setTutorialVisible] = useState<"casual" | "pro" | null>(null);

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
          if (settings.language && settings.language !== "auto") {
            setLocale(settings.language);
          }
          if (settings.mode === "pro") {
            setSubIsPro(true);
          }
          if ((settings as any).fireworks !== undefined) {
            setFireworksEnabledState(!!(settings as any).fireworks);
          }
          if ((settings as any).tabConfig) {
            const tabs = (settings as any).tabConfig.split(",").filter(Boolean);
            if (tabs.length >= 1 && tabs.length <= 4) setTabConfigState(tabs);
          }
          if (!(settings as any).tutorialCasualSeen) {
            setTutorialVisible("casual");
          }
        } catch {
          // ignore
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const showTutorial = useCallback((variant: "casual" | "pro") => {
    setTutorialVisible(variant);
  }, []);

  const closeTutorial = useCallback(async () => {
    const variant = tutorialVisible;
    setTutorialVisible(null);
    if (!variant) return;
    try {
      const settingsApi = createSettingsApi(apiClient);
      if (variant === "casual") {
        await settingsApi.update({ tutorialCasualSeen: true } as any);
      } else {
        await settingsApi.update({ tutorialProSeen: true } as any);
      }
    } catch { /* ignore */ }
  }, [tutorialVisible]);

  const setFireworksEnabled = useCallback(async (on: boolean) => {
    setFireworksEnabledState(on);
    try {
      const settingsApi = createSettingsApi(apiClient);
      await settingsApi.update({ fireworks: on } as any);
    } catch { /* ignore */ }
  }, []);

  const setTabConfig = useCallback(async (tabs: string[]) => {
    setTabConfigState(tabs);
    try {
      const settingsApi = createSettingsApi(apiClient);
      await settingsApi.update({ tabConfig: tabs.join(",") } as any);
    } catch {
      // ignore
    }
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
    () => ({ theme, themeSetting, isDark, isPro, devMode, tabConfig, fireworksEnabled, showTutorial, setThemeSetting, setIsPro: setSubIsPro, setDevMode, setDevIsPro, setTabConfig, setFireworksEnabled }),
    [theme, themeSetting, isDark, isPro, devMode, tabConfig, fireworksEnabled, showTutorial, setThemeSetting, setSubIsPro, setDevMode, setDevIsPro, setTabConfig, setFireworksEnabled],
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
              options={{ title: t(locale, "nav.setting"), headerBackTitle: t(locale, "common.back") }}
            />
            <Stack.Screen
              name="pages/accounts"
              options={{ title: t(locale, "nav.account"), headerBackTitle: t(locale, "common.back") }}
            />
            <Stack.Screen
              name="pages/categories"
              options={{ title: t(locale, "nav.category"), headerBackTitle: t(locale, "common.back") }}
            />
            <Stack.Screen
              name="pages/budgets"
              options={{ title: t(locale, "nav.budget"), headerBackTitle: t(locale, "common.back") }}
            />
            <Stack.Screen
              name="pages/rules"
              options={{ title: t(locale, "nav.rule"), headerBackTitle: t(locale, "common.back") }}
            />
            <Stack.Screen
              name="pages/tags"
              options={{ title: t(locale, "nav.tag"), headerBackTitle: t(locale, "common.back") }}
            />
            <Stack.Screen
              name="pages/transactions"
              options={{ title: t(locale, "nav.transaction"), headerBackTitle: t(locale, "common.back") }}
            />
            <Stack.Screen name="index" options={{ headerShown: false }} />
          </Stack>
          </ThemeProvider>
          {tutorialVisible && (
            <Tutorial visible variant={tutorialVisible} onClose={closeTutorial} />
          )}
          </SubscriptionProvider>
        </ApiClientContext.Provider>
      </I18nProvider>
    </ThemeContext.Provider>
    </GestureHandlerRootView>
  );
}
