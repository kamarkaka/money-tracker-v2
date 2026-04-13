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
import { logger } from "../lib/logger.js";
import type { Logger } from "pino";
import type { Response } from "express";

const plaidLog = logger.child({ cat: "plaid" });
const subscLog = logger.child({ cat: "subsc" });

const router = Router();

function handleRouteError(log: Logger, operation: string, err: unknown, res: Response) {
  const e = err as Error & { statusCode?: number; code?: string };
  if (e.statusCode && e.statusCode < 500) {
    log.warn({ reason: e.code || e.message }, `${operation} failed`);
    res.status(e.statusCode).json({ error: e.message, code: e.code });
  } else {
    log.error({ err }, `${operation} error`);
    res.status(500).json({ error: "Internal server error" });
  }
}

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
      subscLog.info("Verified via client attestation");
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

    subscLog.info("Verified via StoreKit");
    res.json({
      verified: true,
      expiresAt: new Date(payload.expiresDate).toISOString(),
      productId: payload.productId,
    });
  } catch (err) {
    subscLog.warn({ err }, "Verification failed");
    res.status(400).json({ error: "Subscription verification failed" });
  }
});

// ── POST /plaid/link-token ──

router.post("/link-token", linkLimiter, async (req: AuthRequest, res) => {
  try {
    await requireActiveSubscription(req.user!.userId);
    const linkToken = await createLinkToken(req.user!.userId);
    plaidLog.info("Link token created");
    res.json({ linkToken });
  } catch (err) {
    handleRouteError(plaidLog, "Link token", err, res);
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

      const formattedTx = formatTransactions(syncResult.added);

      plaidLog.info({ accounts: plaidAccounts.length, transactions: formattedTx.length }, "Exchange success");

      // 5. Return formatted data for mobile to store locally
      res.status(201).json({
        institution: { plaidItemId: itemId, name: instName, plaidInstitutionId: plaidInstId },
        accounts: formatAccounts(plaidAccounts),
        transactions: {
          added: formattedTx,
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
    handleRouteError(plaidLog, "Exchange", err, res);
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

      const added = formatTransactions(syncResult.added);
      const modified = formatTransactions(syncResult.modified);
      const removedIds = syncResult.removed.map((r) => r.transaction_id);

      plaidLog.info({ added: added.length, modified: modified.length, removed: removedIds.length }, "Sync success");

      res.json({
        accounts: formatAccounts(plaidAccounts),
        transactions: { added, modified, removedIds },
      });
    } catch (plaidErr) {
      // Plaid call failed — refund if it was a paid refresh
      if (paidRefresh) {
        await refundQuota(userId, REFRESH_COST);
      }
      throw plaidErr;
    }
  } catch (err) {
    handleRouteError(plaidLog, "Sync", err, res);
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

    plaidLog.info({ count: items.length }, "Institutions listed");

    res.json(items.map((item) => ({
      plaidItemId: item.plaidItemId,
      name: item.institutionName,
      plaidInstitutionId: item.plaidInstitutionId,
      lastSyncedAt: item.lastSyncedAt?.toISOString() || null,
    })));
  } catch (err) {
    handleRouteError(plaidLog, "Institutions list", err, res);
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
      plaidLog.warn("Unlink failed: item not found");
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

    plaidLog.info("Unlink success");
    res.json({ success: true });
  } catch (err) {
    handleRouteError(plaidLog, "Unlink", err, res);
  }
});

export default router;
