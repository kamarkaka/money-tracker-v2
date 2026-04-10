import { getAuthToken, getBackendBaseUrl } from "@/lib/auth-backend";
import { fetchWithTimeout } from "@/lib/fetch";

// ── Types ──

export interface BackendInstitution {
  plaidItemId: string;
  name: string;
  plaidInstitutionId: string | null;
  lastSyncedAt: string | null;
  accounts: BackendAccount[];
}

export interface BackendAccount {
  plaidAccountId: string;
  name: string;
  type: string;
  subtype: string | null;
  balance: number;
}

export interface BackendTransaction {
  plaidTransactionId: string;
  plaidAccountId: string;
  description: string;
  amount: number;
  date: string;
}

export interface BackendTransactionData {
  added: BackendTransaction[];
  modified: BackendTransaction[];
  removedIds: string[];
}

export interface BackendExchangeResult {
  institution: { plaidItemId: string; name: string; plaidInstitutionId: string | null };
  accounts: BackendAccount[];
  transactions: BackendTransactionData;
}

export interface BackendSyncResult {
  accounts: BackendAccount[];
  transactions: BackendTransactionData;
}

// ── HTTP helper ──

async function backendRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const [baseUrl, token] = await Promise.all([getBackendBaseUrl(), getAuthToken()]);
  if (!token) throw new Error("Not authenticated with backend");

  const res = await fetchWithTimeout(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  }, 30_000);

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.error || `Backend error ${res.status}`);
    (err as Error & { statusCode: number; code?: string }).statusCode = res.status;
    (err as Error & { statusCode: number; code?: string }).code = data?.code;
    throw err;
  }
  return data;
}

// ── API functions ──

export async function createLinkTokenViaBackend(): Promise<string> {
  const data = await backendRequest<{ linkToken: string }>("POST", "/plaid/link-token");
  return data.linkToken;
}

export async function exchangeViaBackend(
  publicToken: string,
  institutionName?: string,
): Promise<BackendExchangeResult> {
  return backendRequest<BackendExchangeResult>("POST", "/plaid/exchange", {
    publicToken,
    institutionName,
  });
}

export async function syncViaBackend(plaidItemId: string): Promise<BackendSyncResult> {
  return backendRequest<BackendSyncResult>("POST", "/plaid/sync", { plaidItemId });
}

export async function getBackendInstitutions(): Promise<BackendInstitution[]> {
  return backendRequest<BackendInstitution[]>("GET", "/plaid/institutions");
}

export async function unlinkViaBackend(plaidItemId: string): Promise<void> {
  await backendRequest("DELETE", `/plaid/institutions/${plaidItemId}`);
}

export async function verifySubscriptionViaBackend(jws: string): Promise<{
  verified: boolean;
  expiresAt: string;
  productId: string;
}> {
  return backendRequest("POST", "/plaid/verify-subscription", { jws });
}
