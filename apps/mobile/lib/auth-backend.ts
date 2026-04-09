import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const AUTH_TOKEN_KEY = "backend_auth_token";
const BACKEND_URL_KEY = "backend_url";

const DEFAULT_BACKEND_URL =
  Constants.expoConfig?.extra?.PLAID_BACKEND_URL || "http://localhost:3001";

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function saveAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return token !== null;
}

export async function getBackendBaseUrl(): Promise<string> {
  return (await SecureStore.getItemAsync(BACKEND_URL_KEY)) || DEFAULT_BACKEND_URL;
}

export async function saveBackendBaseUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(BACKEND_URL_KEY, url);
}

// ── Auth API calls ──

async function authRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const baseUrl = await getBackendBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Auth error ${res.status}`);
  }
  return data;
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string }> {
  const data = await authRequest<{ token: string }>("/auth/login", {
    email,
    password,
  });
  await saveAuthToken(data.token);
  return data;
}

export async function register(
  email: string,
  password: string,
  name?: string,
): Promise<{ token: string }> {
  const data = await authRequest<{ token: string }>("/auth/register", {
    email,
    password,
    name,
  });
  await saveAuthToken(data.token);
  return data;
}

export async function refreshToken(): Promise<{ token: string }> {
  const currentToken = await getAuthToken();
  if (!currentToken) throw new Error("Not authenticated");

  const baseUrl = await getBackendBaseUrl();
  const res = await fetch(`${baseUrl}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${currentToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      await clearAuthToken();
    }
    throw new Error(data?.error || `Token refresh failed`);
  }

  await saveAuthToken(data.token);
  return data;
}

export async function logout(): Promise<void> {
  await clearAuthToken();
}

export async function deleteAccount(): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const baseUrl = await getBackendBaseUrl();
  const res = await fetch(`${baseUrl}/auth/account`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Failed to delete account");
  }

  await clearAuthToken();
}
