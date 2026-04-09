import type { PlaidCredentials } from "./storage";
import { getPlaidEnv } from "./storage";

async function plaidRequest<T>(
  creds: PlaidCredentials,
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const env = await getPlaidEnv();
  const baseUrl = env === "production"
    ? "https://production.plaid.com"
    : "https://sandbox.plaid.com";
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: creds.clientId,
      secret: creds.secret,
      ...body,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(
      err?.error_message ?? `Plaid error ${res.status}`,
    );
  }

  return res.json();
}

// ── Link Token ────────────────────────────────────────────

export async function createLinkToken(
  creds: PlaidCredentials,
  clientUserId: string,
): Promise<string> {
  const data = await plaidRequest<{ link_token: string }>(
    creds,
    "/link/token/create",
    {
      user: { client_user_id: clientUserId },
      client_name: "Money Tracker",
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
      redirect_uri: "https://cdn.plaid.com/link/v2/stable/link.html",
    },
  );
  return data.link_token;
}

// ── Token Exchange ────────────────────────────────────────

export async function exchangePublicToken(
  creds: PlaidCredentials,
  publicToken: string,
): Promise<{ accessToken: string; itemId: string }> {
  const data = await plaidRequest<{
    access_token: string;
    item_id: string;
  }>(creds, "/item/public_token/exchange", {
    public_token: publicToken,
  });
  return { accessToken: data.access_token, itemId: data.item_id };
}

// ── Accounts ──────────────────────────────────────────────

export interface PlaidAccount {
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  balances: {
    current: number | null;
    available: number | null;
  };
}

export async function getAccounts(
  creds: PlaidCredentials,
  accessToken: string,
): Promise<{ accounts: PlaidAccount[]; institutionId: string | null }> {
  const data = await plaidRequest<{
    accounts: PlaidAccount[];
    item: { institution_id: string | null };
  }>(creds, "/accounts/get", {
    access_token: accessToken,
  });
  return {
    accounts: data.accounts,
    institutionId: data.item.institution_id,
  };
}

// ── Institution Info ──────────────────────────────────────

export async function getInstitutionName(
  creds: PlaidCredentials,
  institutionId: string,
): Promise<string> {
  const data = await plaidRequest<{
    institution: { name: string };
  }>(creds, "/institutions/get_by_id", {
    institution_id: institutionId,
    country_codes: ["US"],
  });
  return data.institution.name;
}

// ── Transaction Sync ──────────────────────────────────────

export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name: string | null;
  pending: boolean;
  personal_finance_category?: {
    primary: string;
    detailed: string;
  } | null;
}

export interface SyncResult {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: { transaction_id: string }[];
  nextCursor: string;
  hasMore: boolean;
}

export async function syncTransactions(
  creds: PlaidCredentials,
  accessToken: string,
  cursor?: string,
): Promise<SyncResult> {
  const allAdded: PlaidTransaction[] = [];
  const allModified: PlaidTransaction[] = [];
  const allRemoved: { transaction_id: string }[] = [];

  let currentCursor = cursor || "";
  let hasMore = true;

  while (hasMore) {
    const data = await plaidRequest<{
      added: PlaidTransaction[];
      modified: PlaidTransaction[];
      removed: { transaction_id: string }[];
      next_cursor: string;
      has_more: boolean;
    }>(creds, "/transactions/sync", {
      access_token: accessToken,
      cursor: currentCursor || undefined,
    });

    allAdded.push(...data.added);
    allModified.push(...data.modified);
    allRemoved.push(...data.removed);
    currentCursor = data.next_cursor;
    hasMore = data.has_more;
  }

  return {
    added: allAdded,
    modified: allModified,
    removed: allRemoved,
    nextCursor: currentCursor,
    hasMore: false,
  };
}
