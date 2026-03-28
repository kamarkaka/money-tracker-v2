import * as SecureStore from "expo-secure-store";
import { uuid } from "@/lib/db";

const TOKEN_PREFIX = "plaid_token_";
const CLIENT_USER_ID_KEY = "plaid_client_user_id";

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
