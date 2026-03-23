import { useEffect, useState, useCallback } from "react";
import { useColorScheme } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ApiClientContext } from "@money-tracker/hooks";
import { createAuthApi, createSettingsApi } from "@money-tracker/api-client";
import { AuthContext, type AuthUser } from "@/lib/auth";
import { apiClient, setApiToken } from "@/lib/api";
import { ThemeContext } from "@/lib/themeContext";
import { colors } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";

const TOKEN_KEY = "auth_token";

type ThemeSetting = "light" | "dark" | "system";

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [themeSetting, setThemeSettingState] = useState<ThemeSetting>("system");
  const [locale, setLocale] = useState("en");
  const segments = useSegments();
  const router = useRouter();

  // Resolve theme
  const isDark = themeSetting === "dark" || (themeSetting === "system" && systemScheme === "dark");
  const theme = colors[isDark ? "dark" : "light"];

  // Restore token + settings on launch
  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (stored) {
          setApiToken(stored);
          setToken(stored);
          const authApi = createAuthApi(apiClient);
          const res = await authApi.refresh(stored);
          setApiToken(res.token);
          setToken(res.token);
          setUser(res.user);
          await SecureStore.setItemAsync(TOKEN_KEY, res.token);

          // Load theme setting
          try {
            const settingsApi = createSettingsApi(apiClient);
            const settings = await settingsApi.get();
            if (settings.theme === "light" || settings.theme === "dark" || settings.theme === "system") {
              setThemeSettingState(settings.theme);
            }
            if (settings.language) {
              setLocale(settings.language);
            }
          } catch {
            // ignore
          }
        }
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setApiToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Redirect based on auth state
  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) {
      router.replace("/(auth)/login");
    } else if (user && inAuth) {
      router.replace("/(tabs)/overview");
    }
  }, [user, segments, loading, router]);

  const setThemeSetting = useCallback(async (setting: ThemeSetting) => {
    setThemeSettingState(setting);
    try {
      const settingsApi = createSettingsApi(apiClient);
      await settingsApi.update({ theme: setting });
    } catch {
      // ignore
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const authApi = createAuthApi(apiClient);
    const res = await authApi.login(email, password);
    setApiToken(res.token);
    setToken(res.token);
    setUser(res.user);
    await SecureStore.setItemAsync(TOKEN_KEY, res.token);

    // Load theme after login
    try {
      const settingsApi = createSettingsApi(apiClient);
      const settings = await settingsApi.get();
      if (settings.theme === "light" || settings.theme === "dark" || settings.theme === "system") {
        setThemeSettingState(settings.theme);
      }
    } catch {
      // ignore
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    const authApi = createAuthApi(apiClient);
    const res = await authApi.register({ email, password, name });
    setApiToken(res.token);
    setToken(res.token);
    setUser(res.user);
    await SecureStore.setItemAsync(TOKEN_KEY, res.token);
  }, []);

  const signOut = useCallback(async () => {
    setApiToken(null);
    setToken(null);
    setUser(null);
    setThemeSettingState("system");
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themeSetting, isDark, setThemeSetting }}>
      <I18nProvider initialLocale={locale}>
        <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut }}>
          <ApiClientContext.Provider value={apiClient}>
            <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal/transaction-detail" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen name="pages/profile" options={{ title: "Profile", headerBackTitle: "Back" }} />
            <Stack.Screen name="pages/settings" options={{ title: "Settings", headerBackTitle: "Back" }} />
            <Stack.Screen name="pages/accounts" options={{ title: "Accounts", headerBackTitle: "Back" }} />
            <Stack.Screen name="pages/categories" options={{ title: "Categories", headerBackTitle: "Back" }} />
            <Stack.Screen name="pages/budgets" options={{ title: "Budgets", headerBackTitle: "Back" }} />
            <Stack.Screen name="pages/rules" options={{ title: "Rules", headerBackTitle: "Back" }} />
            <Stack.Screen name="pages/tags" options={{ title: "Tags", headerBackTitle: "Back" }} />
            <Stack.Screen name="pages/transactions" options={{ title: "Transactions", headerBackTitle: "Back" }} />
            <Stack.Screen name="index" options={{ headerShown: false }} />
          </Stack>
          </ApiClientContext.Provider>
        </AuthContext.Provider>
      </I18nProvider>
    </ThemeContext.Provider>
  );
}
