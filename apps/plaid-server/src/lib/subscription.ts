import { jwtVerify, createRemoteJWKSet } from "jose";
import { prisma } from "./db.js";

const APPLE_JWKS_URL = new URL("https://appleid.apple.com/auth/keys");
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || "xyz.mengcao.money-tracker-2";
const VALID_PRODUCT_IDS = [
  "money.tracker.2.pro.subscription.monthly",
  "money.tracker.2.pro.subscription.annual",
];

const appleJWKS = createRemoteJWKSet(APPLE_JWKS_URL);

export interface AppleTransactionPayload {
  originalTransactionId: string;
  transactionId: string;
  productId: string;
  bundleId: string;
  expiresDate: number;
  environment: string;
}

export async function verifyAppleJWS(jws: string): Promise<AppleTransactionPayload> {
  const { payload } = await jwtVerify(jws, appleJWKS, { algorithms: ["ES256"] });
  const p = payload as Record<string, unknown>;

  const bundleId = p.bundleId as string;
  const productId = p.productId as string;
  const expiresDate = p.expiresDate as number;

  if (bundleId !== APPLE_BUNDLE_ID) throw new Error(`Invalid bundle ID: ${bundleId}`);
  if (!VALID_PRODUCT_IDS.includes(productId)) throw new Error(`Invalid product ID: ${productId}`);
  if (!expiresDate || expiresDate < Date.now()) throw new Error("Subscription has expired");

  return {
    originalTransactionId: p.originalTransactionId as string,
    transactionId: p.transactionId as string,
    productId,
    bundleId,
    expiresDate,
    environment: p.environment as string,
  };
}

export async function requireActiveSubscription(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { appleSubscriptionExpiresAt: true },
  });

  if (!user?.appleSubscriptionExpiresAt || user.appleSubscriptionExpiresAt.getTime() <= Date.now()) {
    const err = new Error("Active subscription required") as Error & { statusCode: number; code: string };
    err.statusCode = 403;
    err.code = "SUBSCRIPTION_EXPIRED";
    throw err;
  }
}
