import * as SecureStore from "expo-secure-store";
import { uuid } from "@/lib/db";

const TOKEN_PREFIX = "plaid_token_";
const CLIENT_USER_ID_KEY = "plaid_client_user_id";
const PLAID_CLIENT_ID_KEY = "plaid_client_id";
const PLAID_SECRET_KEY = "plaid_secret";
const PLAID_ENV_KEY = "plaid_env";

export type PlaidCredentials = { clientId: string; secret: string };

export async function savePlaidCredentials(clientId: string, secret: string): Promise<void> {
  await SecureStore.setItemAsync(PLAID_CLIENT_ID_KEY, clientId);
  await SecureStore.setItemAsync(PLAID_SECRET_KEY, secret);
}

export async function getPlaidCredentials(): Promise<PlaidCredentials | null> {
  const clientId = await SecureStore.getItemAsync(PLAID_CLIENT_ID_KEY);
  const secret = await SecureStore.getItemAsync(PLAID_SECRET_KEY);
  if (!clientId || !secret) return null;
  return { clientId, secret };
}

export async function clearPlaidCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(PLAID_CLIENT_ID_KEY);
  await SecureStore.deleteItemAsync(PLAID_SECRET_KEY);
}

export async function savePlaidEnv(env: string): Promise<void> {
  await SecureStore.setItemAsync(PLAID_ENV_KEY, env);
}

export async function getPlaidEnv(): Promise<string> {
  return (await SecureStore.getItemAsync(PLAID_ENV_KEY)) ?? "production";
}

export async function savePlaidToken(
  itemId: string,
  accessToken: string,
): Promise<void> {
  await SecureStore.setItemAsync(`${TOKEN_PREFIX}${itemId}`, accessToken);
}

export async function getPlaidToken(
  itemId: string,
): Promise<string | null> {
  return SecureStore.getItemAsync(`${TOKEN_PREFIX}${itemId}`);
}

export async function deletePlaidToken(
  itemId: string,
): Promise<void> {
  await SecureStore.deleteItemAsync(`${TOKEN_PREFIX}${itemId}`);
}

export async function getOrCreateClientUserId(): Promise<string> {
  let userId = await SecureStore.getItemAsync(CLIENT_USER_ID_KEY);
  if (!userId) {
    userId = uuid();
    await SecureStore.setItemAsync(CLIENT_USER_ID_KEY, userId);
  }
  return userId;
}
