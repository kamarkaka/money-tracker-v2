import { isAuthenticated } from "@/lib/auth-backend";
import { getPlaidCredentials } from "./storage";

export type PlaidMode = "direct" | "backend" | "none";

/**
 * Determine which Plaid mode to use.
 * - "backend": user is authenticated with the backend service (our Plaid credentials)
 * - "direct": user has their own Plaid credentials configured
 * - "none": no Plaid capability available
 *
 * Backend mode takes priority when both are available.
 */
export async function getPlaidMode(): Promise<PlaidMode> {
  const authed = await isAuthenticated();
  if (authed) return "backend";

  const creds = await getPlaidCredentials();
  if (creds) return "direct";

  return "none";
}
