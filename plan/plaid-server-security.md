# Plaid Server Security Audit

## Context

The plaid backend service (`apps/plaid-server/`) proxies Plaid API calls on behalf of mobile users. In production, every Plaid call is charged. This audit identifies abuse vectors and security gaps that could lead to unauthorized usage, data exposure, or cost overruns.

---

## Findings

### Critical

#### 1. `LOCAL_PRO` bypasses subscription verification
**Location:** `src/routes/plaid.ts:60-69`

Any authenticated user can POST `{"jws":"LOCAL_PRO"}` to `/plaid/verify-subscription` and receive 7 days of Pro access with no Apple receipt verification. This is repeatable indefinitely — a user never needs to purchase a subscription.

**Fix:** Gate behind `NODE_ENV !== "production"`, or remove entirely and handle dev-mode subscription on the client side only.

#### 2. Hardcoded JWT fallback secret
**Location:** `src/lib/jwt.ts:3`

```typescript
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-dev-secret");
```

If `JWT_SECRET` is not set in production, all tokens are signed with a publicly known secret. Anyone reading the source code can forge valid JWTs for any user.

**Fix:** Crash on startup if `JWT_SECRET` is missing or too short. Add a minimum length check (e.g., 32 chars).

---

### High

#### 3. No rate limiting on any endpoint
**Location:** `src/index.ts` (absent)

No rate limiting middleware exists. Abuse vectors:
- `/auth/login` — unlimited brute-force and credential-stuffing
- `/auth/register` — mass account creation
- `/plaid/verify-subscription` — subscription spam with `LOCAL_PRO`
- `/plaid/exchange` — trigger unlimited Plaid API calls (each costs money)

**Fix:** Add `express-rate-limit`. Suggested limits:
- `/auth/login`: 5 per 15 min per IP
- `/auth/register`: 3 per hour per IP
- `/plaid/exchange`: 3 per min per user
- `/plaid/sync`: 20 per hour per user
- `/plaid/link-token`: 5 per min per user

#### 4. Wide-open CORS
**Location:** `src/index.ts:9`

`app.use(cors())` allows requests from any origin. Any website can make authenticated API calls if a user's JWT is intercepted.

**Fix:** Since this is a mobile-only backend, restrict to the app's scheme or remove CORS entirely (mobile apps don't need CORS headers).

#### 5. No token revocation
**Location:** `src/lib/auth.ts:8-24`, `src/lib/jwt.ts`

`requireAuth` only verifies the JWT signature — it does not check if the user still exists. After account deletion, the JWT remains valid for up to 30 days.

**Fix:** Add a `tokenVersion` field to the User model. Increment it on logout/delete. Check it in `requireAuth` (requires a DB lookup per request — acceptable for this scale). Or maintain a short-lived blocklist.

#### 6. TOCTOU race condition in quota system
**Location:** `src/lib/quota.ts:57-65`, `src/routes/plaid.ts:126-160`

Quota check and deduction are separate operations:
1. `checkLinkQuota` reads points and verifies `points >= 30`
2. Plaid API call happens (takes seconds)
3. `deductQuota` subtracts 30

Two concurrent requests can both pass step 1, both execute the Plaid call, and the user goes negative on points. Same race exists for `checkRefreshQuota` / `markFreeRefreshUsed`.

**Fix:** Use an atomic update with a WHERE clause:
```sql
UPDATE user SET quota_points = quota_points - $cost
WHERE id = $userId AND quota_points >= $cost
```
Check the affected row count — if 0, deny the request.

---

### Medium

#### 7. No email format validation
**Location:** `src/routes/auth.ts:14`

Any string is accepted as an email — e.g., `"x"` is valid. This allows junk registrations and makes the email field unreliable.

**Fix:** Validate email format with a regex or `validator.js`.

#### 8. Raw error messages sent to clients
**Location:** `src/routes/auth.ts:33`, `src/routes/plaid.ts:107,174,238`

`err.message` is returned directly. Prisma errors can expose table names, column names, and query structure. Plaid errors can expose internal details.

**Fix:** Return generic error messages to clients. Log the full error server-side.

#### 9. No security headers
**Location:** `src/index.ts` (absent)

No `helmet` middleware — missing `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, etc.

**Fix:** Add `helmet` middleware.

#### 10. Long token lifetime with unlimited refresh
**Location:** `src/lib/jwt.ts:5`, `src/routes/auth.ts:68-82`

30-day token lifetime is long. The `/auth/refresh` endpoint issues fresh tokens with no rate limit, allowing indefinite session extension.

**Fix:** Shorten token lifetime (e.g., 7 days). Rate-limit the refresh endpoint.

#### 11. No database-level floor on quotaPoints
**Location:** `prisma/schema.prisma:26`

`quotaPoints` is `Int @default(300)` with no constraint preventing negative values. While the quota check should prevent this, the TOCTOU race (finding #6) can cause it.

**Fix:** Add a CHECK constraint via raw migration: `ALTER TABLE "user" ADD CONSTRAINT quota_points_floor CHECK (quota_points >= 0)`.

---

### Low

#### 12. No request logging
**Location:** `src/index.ts` (absent)

No request-level logging (e.g., morgan). Makes incident investigation and abuse detection difficult.

**Fix:** Add `morgan` middleware for access logs.

#### 13. Quota diagnostic logs in production
**Location:** `src/lib/quota.ts` (throughout)

`console.log("[Quota] ...")` statements are useful for development but noisy in production. These logs could also reveal quota internals if logs are accidentally exposed.

**Fix:** Use a proper logger with log levels, or gate behind `NODE_ENV !== "production"`.

---

## Implementation Priority

```
Phase 1 (before production):
  - #1 Gate LOCAL_PRO behind NODE_ENV
  - #2 Crash if JWT_SECRET is missing
  - #3 Add rate limiting (express-rate-limit)
  - #4 Restrict CORS

Phase 2 (hardening):
  - #6 Atomic quota deduction (fix TOCTOU race)
  - #5 Token revocation via tokenVersion
  - #7 Email validation
  - #8 Sanitize error responses
  - #9 Add helmet

Phase 3 (polish):
  - #10 Shorten token lifetime
  - #11 DB-level quota floor
  - #12 Request logging
  - #13 Production-safe logging
```
