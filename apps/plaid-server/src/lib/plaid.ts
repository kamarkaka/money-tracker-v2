import { logger } from "./logger.js";

const log = logger.child({ cat: "plaid" });

// ── Types ──

export interface PlaidAccount {
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  balances: { current: number | null; available: number | null };
}

export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name: string | null;
  pending: boolean;
}

export interface SyncResult {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: { transaction_id: string }[];
  nextCursor: string;
}

// ── Client ──

function getConfig() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV || "sandbox";
  if (!clientId || !secret) throw new Error("Missing PLAID_CLIENT_ID or PLAID_SECRET");
  const baseUrl = env === "production"
    ? "https://production.plaid.com"
    : "https://sandbox.plaid.com";
  return { clientId, secret, baseUrl };
}

async function plaidRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { clientId, secret, baseUrl } = getConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, secret, ...body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    log.error({ path, errorCode: err?.error_code, status: res.status }, "Plaid API request failed");
    throw new Error("Plaid request failed");
  }
  return res.json() as Promise<T>;
}

export async function createLinkToken(clientUserId: string): Promise<string> {
  const data = await plaidRequest<{ link_token: string }>("/link/token/create", {
    user: { client_user_id: clientUserId },
    client_name: "Money Tracker",
    products: ["transactions"],
    country_codes: ["US"],
    language: "en",
    redirect_uri: "https://cdn.plaid.com/link/v2/stable/link.html",
  });
  return data.link_token;
}

export async function exchangePublicToken(publicToken: string) {
  const data = await plaidRequest<{ access_token: string; item_id: string }>(
    "/item/public_token/exchange",
    { public_token: publicToken },
  );
  return { accessToken: data.access_token, itemId: data.item_id };
}

export async function getAccounts(accessToken: string) {
  const data = await plaidRequest<{
    accounts: PlaidAccount[];
    item: { institution_id: string | null };
  }>("/accounts/get", { access_token: accessToken });
  return { accounts: data.accounts, institutionId: data.item.institution_id };
}

export async function getInstitutionName(institutionId: string): Promise<string> {
  const data = await plaidRequest<{ institution: { name: string } }>(
    "/institutions/get_by_id",
    { institution_id: institutionId, country_codes: ["US"] },
  );
  return data.institution.name;
}

export async function syncTransactions(accessToken: string, cursor?: string): Promise<SyncResult> {
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
    }>("/transactions/sync", {
      access_token: accessToken,
      cursor: currentCursor || undefined,
    });
    allAdded.push(...data.added);
    allModified.push(...data.modified);
    allRemoved.push(...data.removed);
    currentCursor = data.next_cursor;
    hasMore = data.has_more;
  }

  return { added: allAdded, modified: allModified, removed: allRemoved, nextCursor: currentCursor };
}

export async function removeItem(accessToken: string): Promise<void> {
  await plaidRequest("/item/remove", { access_token: accessToken });
}

// ── Helpers ──

export function mapAccountType(plaidType: string): string {
  switch (plaidType) {
    case "depository": return "checking";
    case "credit": return "credit";
    case "investment": return "investment";
    case "loan": return "loan";
    default: return "checking";
  }
}

export function mapAccountSubtype(plaidType: string, plaidSubtype: string | null): string {
  if (plaidType === "depository" && plaidSubtype === "savings") return "savings";
  return mapAccountType(plaidType);
}
