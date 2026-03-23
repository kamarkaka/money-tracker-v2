import Constants from "expo-constants";
import { ApiClient } from "@money-tracker/api-client";

const API_BASE_URL: string =
  Constants.expoConfig?.extra?.apiUrl || "http://localhost:3000";

let currentToken: string | null = null;

export function setApiToken(token: string | null) {
  currentToken = token;
}

export const apiClient = new ApiClient({
  baseUrl: API_BASE_URL,
  getToken: async () => currentToken,
});
