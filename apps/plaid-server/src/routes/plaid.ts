import { Router } from "express";
import { prisma } from "../lib/db.js";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { requireActiveSubscription, verifyAppleJWS } from "../lib/subscription.js";
import { encryptToken, decryptToken } from "../lib/crypto.js";
import { checkLinkQuota, checkRefreshQuota, deductQuota, refundQuota, tryClaimFreeRefresh, LINK_COST, REFRESH_COST } from "../lib/quota.js";
import {
  createLinkToken,
  exchangePublicToken,
  getAccounts,
  getInstitutionName,
  syncTransactions,
  removeItem,
  mapAccountSubtype,
  type PlaidAccount,
  type PlaidTransaction,
} from "../lib/plaid.js";
import { verifyLimiter, linkLimiter, exchangeLimiter, syncLimiter, institutionsLimiter, unlinkLimiter } from "../lib/rate-limit.js";

const router = Router();

/** Atomically deduct quota or throw a 429 error caught by the outer try/catch */
async function requireQuota(userId: string, cost: number): Promise<void> {
  const ok = await deductQuota(userId, cost);
  if (!ok) {
    const err = new Error("Insufficient quota") as Error & { statusCode: number; code: string };
    err.statusCode = 429;
    err.code = "QUOTA_EXCEEDED";
    throw err;
  }
}

// All plaid routes require auth
router.use(requireAuth);

// ── Helpers ──

function formatAccounts(plaidAccounts: PlaidAccount[]) {
  return plaidAccounts.map((a) => ({
    plaidAccountId: a.account_id,
    name: a.name,
    type: mapAccountSubtype(a.type, a.subtype),
    subtype: a.subtype,
    balance: a.balances.current ?? a.balances.available ?? 0,
  }));
}

function formatTransactions(txns: PlaidTransaction[]) {
  return txns
    .filter((tx) => !tx.pending)
    .map((tx) => ({
      plaidTransactionId: tx.transaction_id,
      plaidAccountId: tx.account_id,
      description: tx.merchant_name || tx.name,
      amount: -tx.amount, // Plaid positive = spending, app positive = income
      date: tx.date,
    }));
}

// ── POST /plaid/verify-subscription ──

router.post("/verify-subscription", verifyLimiter, async (req: AuthRequest, res) => {
  try {
    const { jws } = req.body;
    if (!jws || typeof jws !== "string") {
      res.status(400).json({ error: "Missing jws field" });
      return;
    }

    // Client-attested Pro status (StoreKit unavailable — simulator/dev only).
    // Blocked in production to prevent subscription bypass.
    if (jws === "LOCAL_PRO" && process.env.NODE_ENV !== "production") {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: {
          appleSubscriptionExpiresAt: expiresAt,
          appleSubscriptionProductId: "client_attested",
          appleSubscriptionStatus: "active",
        },
      });
      res.json({ verified: true, expiresAt: expiresAt.toISOString(), productId: "client_attested" });
      return;
    }

    // Full Apple JWS verification
    const payload = await verifyAppleJWS(jws);

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        appleOriginalTransactionId: payload.originalTransactionId,
        appleSubscriptionExpiresAt: new Date(payload.expiresDate),
        appleSubscriptionProductId: payload.productId,
        appleSubscriptionStatus: "active",
      },
    });

    res.json({
      verified: true,
      expiresAt: new Date(payload.expiresDate).toISOString(),
      productId: payload.productId,
    });
  } catch (err) {
    console.error("[Plaid] verify-subscription:", err);
    res.status(400).json({ error: "Subscription verification failed" });
  }
});

// ── POST /plaid/link-token ──

router.post("/link-token", linkLimiter, async (req: AuthRequest, res) => {
  try {
    await requireActiveSubscription(req.user!.userId);
    const linkToken = await createLinkToken(req.user!.userId);
    res.json({ linkToken });
  } catch (err) {
    const e = err as Error & { statusCode?: number; code?: string };
    if (e.statusCode && e.statusCode < 500) {
      res.status(e.statusCode).json({ error: e.message, code: e.code });
    } else {
      console.error("[Plaid]", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// ── POST /plaid/exchange ──

router.post("/exchange", exchangeLimiter, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;

  try {
    await requireActiveSubscription(userId);

    const { publicToken, institutionName } = req.body;
    if (!publicToken || typeof publicToken !== "string" || publicToken.length > 500) {
      res.status(400).json({ error: "Invalid publicToken" });
      return;
    }
    const providedName = (institutionName && typeof institutionName === "string")
      ? institutionName.slice(0, 255).trim()
      : null;

    // Deduct link cost upfront (atomic — prevents TOCTOU race)
    const quotaCheck = await checkLinkQuota(userId);
    if (!quotaCheck.allowed) {
      res.status(429).json({ error: quotaCheck.reason, code: "QUOTA_EXCEEDED" });
      return;
    }
    await requireQuota(userId, LINK_COST);

    try {
      // 1. Exchange token
      const { accessToken, itemId } = await exchangePublicToken(publicToken);

      // 2. Get accounts and institution info
      const { accounts: plaidAccounts, institutionId: plaidInstId } = await getAccounts(accessToken);

      let instName = providedName || "Linked Institution";
      if (!providedName && plaidInstId) {
        try { instName = await getInstitutionName(plaidInstId); } catch { /* keep fallback */ }
      }

      // 3. Initial transaction sync
      const syncResult = await syncTransactions(accessToken);

      // 4. Store encrypted access token
      await prisma.plaidItem.create({
        data: {
          userId,
          plaidItemId: itemId,
          accessToken: encryptToken(accessToken),
          institutionName: instName,
          plaidInstitutionId: plaidInstId,
          syncCursor: syncResult.nextCursor,
          lastSyncedAt: new Date(),
        },
      });

      // 5. Return formatted data for mobile to store locally
      res.status(201).json({
        institution: { plaidItemId: itemId, name: instName, plaidInstitutionId: plaidInstId },
        accounts: formatAccounts(plaidAccounts),
        transactions: {
          added: formatTransactions(syncResult.added),
          modified: formatTransactions(syncResult.modified),
          removedIds: syncResult.removed.map((r) => r.transaction_id),
        },
      });
    } catch (plaidErr) {
      // Plaid call failed — refund the quota
      await refundQuota(userId, LINK_COST);
      throw plaidErr;
    }
  } catch (err) {
    const e = err as Error & { statusCode?: number; code?: string };
    if (e.statusCode && e.statusCode < 500) {
      res.status(e.statusCode).json({ error: e.message, code: e.code });
    } else {
      console.error("[Plaid]", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// ── POST /plaid/sync ──

router.post("/sync", syncLimiter, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;

  try {
    await requireActiveSubscription(userId);

    const { plaidItemId } = req.body;
    if (!plaidItemId || typeof plaidItemId !== "string" || plaidItemId.length > 100) {
      res.status(400).json({ error: "Invalid plaidItemId" });
      return;
    }

    const item = await prisma.plaidItem.findFirst({
      where: { plaidItemId, userId },
    });
    if (!item) {
      res.status(404).json({ error: "Plaid item not found" });
      return;
    }

    // Check refresh quota (free refresh, cooldown, points)
    const quotaCheck = await checkRefreshQuota(userId, plaidItemId);
    if (!quotaCheck.allowed) {
      res.status(429).json({ error: quotaCheck.reason, code: "QUOTA_EXCEEDED" });
      return;
    }

    // Deduct/mark upfront (atomic — prevents TOCTOU race)
    // Try free refresh first; if unavailable or lost to a concurrent request, fall back to paid
    const paidRefresh = !(quotaCheck.isFreeRefresh && await tryClaimFreeRefresh(plaidItemId));
    if (paidRefresh) {
      await requireQuota(userId, REFRESH_COST);
    }

    try {
      const accessToken = decryptToken(item.accessToken);

      // Sync accounts
      const { accounts: plaidAccounts } = await getAccounts(accessToken);

      // Incremental transaction sync
      const syncResult = await syncTransactions(accessToken, item.syncCursor || undefined);

      // Update cursor and record sync
      await prisma.plaidItem.update({
        where: { id: item.id },
        data: { syncCursor: syncResult.nextCursor, lastSyncedAt: new Date() },
      });

      res.json({
        accounts: formatAccounts(plaidAccounts),
        transactions: {
          added: formatTransactions(syncResult.added),
          modified: formatTransactions(syncResult.modified),
          removedIds: syncResult.removed.map((r) => r.transaction_id),
        },
      });
    } catch (plaidErr) {
      // Plaid call failed — refund if it was a paid refresh
      if (paidRefresh) {
        await refundQuota(userId, REFRESH_COST);
      }
      throw plaidErr;
    }
  } catch (err) {
    const e = err as Error & { statusCode?: number; code?: string };
    if (e.statusCode && e.statusCode < 500) {
      res.status(e.statusCode).json({ error: e.message, code: e.code });
    } else {
      console.error("[Plaid]", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// ── GET /plaid/institutions ──

router.get("/institutions", institutionsLimiter, async (req: AuthRequest, res) => {
  try {
    await requireActiveSubscription(req.user!.userId);

    // Return cached metadata only — no live Plaid API calls
    const items = await prisma.plaidItem.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
    });

    res.json(items.map((item) => ({
      plaidItemId: item.plaidItemId,
      name: item.institutionName,
      plaidInstitutionId: item.plaidInstitutionId,
      lastSyncedAt: item.lastSyncedAt?.toISOString() || null,
    })));
  } catch (err) {
    const e = err as Error & { statusCode?: number; code?: string };
    if (e.statusCode && e.statusCode < 500) {
      res.status(e.statusCode).json({ error: e.message, code: e.code });
    } else {
      console.error("[Plaid]", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// ── DELETE /plaid/institutions/:plaidItemId ──

router.delete("/institutions/:plaidItemId", unlinkLimiter, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const plaidItemId = req.params.plaidItemId as string;

  try {
    await requireActiveSubscription(userId);

    const item = await prisma.plaidItem.findFirst({
      where: { plaidItemId, userId },
    });
    if (!item) {
      res.status(404).json({ error: "Plaid item not found" });
      return;
    }

    // Revoke at Plaid
    try {
      const accessToken = decryptToken(item.accessToken);
      await removeItem(accessToken);
    } catch {
      // Continue even if Plaid revocation fails
    }

    // Delete from our DB
    await prisma.plaidItem.delete({ where: { id: item.id } });

    res.json({ success: true });
  } catch (err) {
    const e = err as Error & { statusCode?: number; code?: string };
    if (e.statusCode && e.statusCode < 500) {
      res.status(e.statusCode).json({ error: e.message, code: e.code });
    } else {
      console.error("[Plaid]", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default router;
