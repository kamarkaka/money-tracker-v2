import { prisma } from "./db.js";

/** Total points granted per month */
export const MONTHLY_QUOTA = 300;
/** Points reserved per linked institution each month */
export const LINK_COST = 30;
/** Points deducted per paid refresh (after the free one) */
export const REFRESH_COST = 13;
/** Minimum hours between paid refreshes per institution */
export const REFRESH_COOLDOWN_HOURS = 24;

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Ensure quota is initialized for the current month.
 * If the stored month differs, reset points to MONTHLY_QUOTA minus
 * LINK_COST per linked institution.
 * Returns the current remaining points.
 */
export async function ensureQuota(userId: string): Promise<number> {
  const month = currentMonth();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { quotaMonth: true, quotaPoints: true },
  });

  if (user?.quotaMonth === month) {
    if (process.env.NODE_ENV !== "production") console.log(`[Quota] ${month} already initialized: ${user.quotaPoints} points remaining`);
    return user.quotaPoints;
  }

  // Reset for new month
  const linkedCount = await prisma.plaidItem.count({ where: { userId } });
  const points = MONTHLY_QUOTA - LINK_COST * linkedCount;

  await prisma.user.update({
    where: { id: userId },
    data: { quotaMonth: month, quotaPoints: points },
  });

  // Reset free refresh flags for all items
  await prisma.plaidItem.updateMany({
    where: { userId },
    data: { freeRefreshMonth: null },
  });

  if (process.env.NODE_ENV !== "production") console.log(`[Quota] Reset for ${month}: ${points} points (${MONTHLY_QUOTA} - ${linkedCount} × ${LINK_COST})`);
  return points;
}

/**
 * Atomically deduct points from user's quota.
 * Returns true if deduction succeeded, false if insufficient points.
 */
export async function deductQuota(userId: string, amount: number): Promise<boolean> {
  const result = await prisma.$executeRaw`
    UPDATE "user" SET quota_points = quota_points - ${amount}, updated_at = NOW()
    WHERE id = ${userId} AND quota_points >= ${amount}
  `;
  if (result === 0) {
    if (process.env.NODE_ENV !== "production") console.log(`[Quota] Deduction rejected: not enough points for ${amount}`);
    return false;
  }
  if (process.env.NODE_ENV !== "production") {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { quotaPoints: true } });
    console.log(`[Quota] Deducted ${amount} points, ${user?.quotaPoints ?? 0} remaining`);
  }
  return true;
}

/**
 * Refund points back to user's quota (used when a Plaid call fails after deduction).
 */
export async function refundQuota(userId: string, amount: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { quotaPoints: { increment: amount } },
  });
  if (process.env.NODE_ENV !== "production") console.log(`[Quota] Refunded ${amount} points`);
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  isFreeRefresh?: boolean;
  remainingPoints?: number;
}

/**
 * Check if a link operation is allowed (has enough quota).
 */
export async function checkLinkQuota(userId: string): Promise<QuotaCheckResult> {
  const points = await ensureQuota(userId);
  if (points < LINK_COST) {
    if (process.env.NODE_ENV !== "production") console.log(`[Quota] Link denied: ${points} points remaining, need ${LINK_COST}`);
    return { allowed: false, reason: `Insufficient quota: ${points} points remaining, need ${LINK_COST}`, remainingPoints: points };
  }
  if (process.env.NODE_ENV !== "production") console.log(`[Quota] Link allowed: ${points} points remaining, will cost ${LINK_COST}`);
  return { allowed: true, remainingPoints: points };
}

/**
 * Check if a refresh operation is allowed for a given PlaidItem.
 * Handles free refresh, cooldown, and point checks.
 */
export async function checkRefreshQuota(userId: string, plaidItemId: string): Promise<QuotaCheckResult> {
  const month = currentMonth();
  const points = await ensureQuota(userId);

  const item = await prisma.plaidItem.findFirst({
    where: { plaidItemId, userId },
    select: { freeRefreshMonth: true, lastSyncedAt: true },
  });
  if (!item) {
    return { allowed: false, reason: "Plaid item not found" };
  }

  // First refresh of the month is free
  const isFreeRefresh = item.freeRefreshMonth !== month;
  if (isFreeRefresh) {
    if (process.env.NODE_ENV !== "production") console.log(`[Quota] Refresh allowed (free): first refresh this month for item ${plaidItemId}`);
    return { allowed: true, isFreeRefresh: true, remainingPoints: points };
  }

  // Check 24h cooldown
  if (item.lastSyncedAt) {
    const cooldownMs = REFRESH_COOLDOWN_HOURS * 60 * 60 * 1000;
    const elapsed = Date.now() - item.lastSyncedAt.getTime();
    if (elapsed < cooldownMs) {
      const remainingHrs = ((cooldownMs - elapsed) / (60 * 60 * 1000)).toFixed(1);
      if (process.env.NODE_ENV !== "production") console.log(`[Quota] Refresh denied: cooldown active, ${remainingHrs}h remaining for item ${plaidItemId}`);
      return { allowed: false, reason: `Refresh cooldown: try again in ${remainingHrs}h`, remainingPoints: points };
    }
  }

  // Check points
  if (points < REFRESH_COST) {
    if (process.env.NODE_ENV !== "production") console.log(`[Quota] Refresh denied: ${points} points remaining, need ${REFRESH_COST}`);
    return { allowed: false, reason: `Insufficient quota: ${points} points remaining, need ${REFRESH_COST}`, remainingPoints: points };
  }

  if (process.env.NODE_ENV !== "production") console.log(`[Quota] Refresh allowed (paid): ${points} points remaining, will cost ${REFRESH_COST}`);
  return { allowed: true, isFreeRefresh: false, remainingPoints: points };
}

/**
 * Record a free refresh for this month on the given PlaidItem.
 */
export async function markFreeRefreshUsed(plaidItemId: string): Promise<void> {
  const month = currentMonth();
  await prisma.plaidItem.update({
    where: { plaidItemId },
    data: { freeRefreshMonth: month },
  });
  if (process.env.NODE_ENV !== "production") console.log(`[Quota] Free refresh used for item ${plaidItemId} in ${month}`);
}
