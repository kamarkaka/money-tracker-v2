import rateLimit from "express-rate-limit";
import type { Request } from "express";

function env(key: string, fallback: number): number {
  const val = process.env[key];
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const msg = (text: string) => ({ error: text });

// Auth routes
export const registerLimiter = rateLimit({ windowMs: env("RL_REGISTER_WINDOW_MS", 3_600_000), limit: env("RL_REGISTER_LIMIT", 3), message: msg("Too many registrations. Try again later.") });
// Per-IP login limiter
export const loginLimiter = rateLimit({ windowMs: env("RL_LOGIN_WINDOW_MS", 900_000), limit: env("RL_LOGIN_LIMIT", 5), message: msg("Too many login attempts. Try again later.") });
// Per-email login limiter — prevents brute-force against a single account across multiple IPs
export const loginByEmailLimiter = rateLimit({
  windowMs: env("RL_LOGIN_EMAIL_WINDOW_MS", 900_000),
  limit: env("RL_LOGIN_EMAIL_LIMIT", 10),
  keyGenerator: (req: Request) => (req.body?.email || "unknown").toLowerCase(),
  message: msg("Too many login attempts for this account. Try again later."),
});
export const refreshLimiter = rateLimit({ windowMs: env("RL_REFRESH_WINDOW_MS", 60_000), limit: env("RL_REFRESH_LIMIT", 10), message: msg("Too many requests. Try again later.") });
export const deleteAccountLimiter = rateLimit({ windowMs: env("RL_DELETE_WINDOW_MS", 3_600_000), limit: env("RL_DELETE_LIMIT", 3), message: msg("Too many requests. Try again later.") });

// Plaid routes
export const verifyLimiter = rateLimit({ windowMs: env("RL_VERIFY_WINDOW_MS", 60_000), limit: env("RL_VERIFY_LIMIT", 10), message: msg("Too many requests. Try again later.") });
export const linkLimiter = rateLimit({ windowMs: env("RL_LINK_WINDOW_MS", 60_000), limit: env("RL_LINK_LIMIT", 5), message: msg("Too many requests. Try again later.") });
export const exchangeLimiter = rateLimit({ windowMs: env("RL_EXCHANGE_WINDOW_MS", 60_000), limit: env("RL_EXCHANGE_LIMIT", 3), message: msg("Too many requests. Try again later.") });
export const syncLimiter = rateLimit({ windowMs: env("RL_SYNC_WINDOW_MS", 3_600_000), limit: env("RL_SYNC_LIMIT", 20), message: msg("Too many sync requests. Try again later.") });
export const institutionsLimiter = rateLimit({ windowMs: env("RL_INSTITUTIONS_WINDOW_MS", 60_000), limit: env("RL_INSTITUTIONS_LIMIT", 30), message: msg("Too many requests. Try again later.") });
export const unlinkLimiter = rateLimit({ windowMs: env("RL_UNLINK_WINDOW_MS", 60_000), limit: env("RL_UNLINK_LIMIT", 5), message: msg("Too many requests. Try again later.") });
