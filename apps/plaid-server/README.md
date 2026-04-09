# Plaid Backend Service

A standalone Express server that proxies Plaid API calls on behalf of Money Tracker mobile app users who don't have their own Plaid developer credentials.

## Responsibility

The mobile app is local-first — all financial data lives on-device in SQLite. This service handles only the Plaid integration layer:

1. **User authentication** — register/login with email+password, JWT-based sessions
2. **Subscription verification** — validates Apple in-app purchase receipts to gate access
3. **Plaid proxy** — creates link tokens, exchanges public tokens, syncs transactions using our Plaid credentials
4. **Access token storage** — stores encrypted Plaid access tokens and sync cursors server-side

This service does **not** store any financial data (balances, transactions, categories, budgets). It returns formatted Plaid data to the mobile app, which stores it locally.

## Architecture

```
Mobile App
  │
  ├── POST /auth/register        → create account, get JWT
  ├── POST /auth/login            → authenticate, get JWT
  ├── POST /plaid/verify-subscription → verify Apple receipt
  ├── POST /plaid/link-token      → get Plaid Link token
  ├── POST /plaid/exchange        → exchange public token + initial sync
  ├── POST /plaid/sync            → incremental transaction sync
  ├── GET  /plaid/institutions    → list linked institutions
  └── DELETE /plaid/institutions/:id → unlink institution
                │
                ▼
          Plaid Backend
                │
                ▼
           Plaid API
```

All Plaid routes require:
- Valid JWT (Bearer token)
- Active Apple subscription (verified via `/plaid/verify-subscription`)

## Database Schema

Two models in PostgreSQL via Prisma:

**User** — email, password hash, subscription status, quota tracking

**PlaidItem** — per-institution Plaid access token (AES-256-GCM encrypted), sync cursor, free refresh tracking. Cascade-deletes with User.

## Quota System

Plaid API calls cost money. The quota system prevents excessive usage per user.

| Parameter | Value | Description |
|-----------|-------|-------------|
| Monthly quota | 300 points | Reset on the 1st of each month |
| Link cost | 30 points | Deducted when linking a new institution |
| Refresh cost | 13 points | Deducted per paid refresh |
| Free refresh | 1/month/institution | First refresh each month is free |
| Cooldown | 24 hours | Minimum time between paid refreshes per institution |
| Monthly deduction | 30 × linked institutions | Deducted from quota on monthly reset |

When quota is exceeded, the server returns `429` with `{ "code": "QUOTA_EXCEEDED" }`. The mobile app silently shows "Up to date" instead of an error.

## Rate Limits

All endpoints are rate-limited per IP. Limits are configurable via environment variables.

| Endpoint | Default Limit | Default Window | Env Vars |
|----------|---------------|----------------|----------|
| `POST /auth/register` | 3 | 1 hour | `RL_REGISTER_LIMIT`, `RL_REGISTER_WINDOW_MS` |
| `POST /auth/login` | 5 | 15 min | `RL_LOGIN_LIMIT`, `RL_LOGIN_WINDOW_MS` |
| `POST /auth/refresh` | 10 | 1 min | `RL_REFRESH_LIMIT`, `RL_REFRESH_WINDOW_MS` |
| `DELETE /auth/account` | 3 | 1 hour | `RL_DELETE_LIMIT`, `RL_DELETE_WINDOW_MS` |
| `POST /plaid/verify-subscription` | 10 | 1 min | `RL_VERIFY_LIMIT`, `RL_VERIFY_WINDOW_MS` |
| `POST /plaid/link-token` | 5 | 1 min | `RL_LINK_LIMIT`, `RL_LINK_WINDOW_MS` |
| `POST /plaid/exchange` | 3 | 1 min | `RL_EXCHANGE_LIMIT`, `RL_EXCHANGE_WINDOW_MS` |
| `POST /plaid/sync` | 20 | 1 hour | `RL_SYNC_LIMIT`, `RL_SYNC_WINDOW_MS` |
| `GET /plaid/institutions` | 30 | 1 min | `RL_INSTITUTIONS_LIMIT`, `RL_INSTITUTIONS_WINDOW_MS` |
| `DELETE /plaid/institutions/:id` | 5 | 1 min | `RL_UNLINK_LIMIT`, `RL_UNLINK_WINDOW_MS` |

## Security

- **Access tokens encrypted at rest** — AES-256-GCM, key from `PLAID_TOKEN_ENCRYPTION_KEY` env var
- **JWT secret required** — server crashes on startup if `JWT_SECRET` is missing or < 32 chars
- **`LOCAL_PRO` dev-only** — client-attested subscription bypass is blocked when `NODE_ENV=production`
- **User isolation** — all Prisma queries scope by `userId`
- **Account deletion** — `DELETE /auth/account` revokes Plaid tokens and cascade-deletes all data

## Setup

```bash
npm install
cp .env.example .env   # configure DATABASE_URL, JWT_SECRET, Plaid keys, encryption key
npx prisma generate
npx prisma db push
npm run dev             # starts on port 3001
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Min 32 chars, used for signing JWTs |
| `PLAID_CLIENT_ID` | Yes | Plaid developer client ID |
| `PLAID_SECRET` | Yes | Plaid developer secret |
| `PLAID_ENV` | No | `sandbox` (default) or `production` |
| `PLAID_TOKEN_ENCRYPTION_KEY` | Yes | 64-char hex string (32 bytes) for AES-256-GCM |
| `APPLE_BUNDLE_ID` | No | iOS bundle ID for receipt verification |
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | Set to `production` to block `LOCAL_PRO` bypass |
| `RL_*` | No | Rate limit overrides (see table above) |

## Docker

```bash
# From repo root
docker build -f apps/plaid-server/Dockerfile -t plaid-server .
docker run -p 3001:3001 --env-file apps/plaid-server/.env plaid-server
```
