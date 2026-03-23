import { useEffect, useState, useCallback } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ApiClientContext } from "@money-tracker/hooks";
import { createAuthApi } from "@money-tracker/api-client";
import { AuthContext, type AuthUser } from "@/lib/auth";
import { apiClient, setApiToken } from "@/lib/api";

const TOKEN_KEY = "auth_token";

export default function RootLayout() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  // Restore token on launch
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
        }
      } catch {
        // Token expired or invalid, stay logged out
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

  const signIn = useCallback(async (email: string, password: string) => {
    const authApi = createAuthApi(apiClient);
    const res = await authApi.login(email, password);
    setApiToken(res.token);
    setToken(res.token);
    setUser(res.user);
    await SecureStore.setItemAsync(TOKEN_KEY, res.token);
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
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut }}>
      <ApiClientContext.Provider value={apiClient}>
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal/add-transaction" options={{ presentation: "modal", headerShown: false }} />
          <Stack.Screen name="modal/transaction-detail" options={{ presentation: "modal", headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </ApiClientContext.Provider>
    </AuthContext.Provider>
  );
}
