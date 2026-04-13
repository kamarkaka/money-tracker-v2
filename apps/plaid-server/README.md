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

## Logging

Uses [pino](https://github.com/pinojs/pino) for structured JSON logging and `pino-http` for automatic HTTP request logging.

**Log levels:** `fatal`, `error`, `warn`, `info`, `debug`, `trace` (default: `info`)

Set via `LOG_LEVEL` env variable:

```bash
LOG_LEVEL=debug   # show debug and above
LOG_LEVEL=warn    # show warn and error only
```

**Log categories:** Each module uses a child logger with a `cat` field:
- `auth` — registration, login, token refresh, account deletion
- `plaid` — link token, exchange, sync, institutions, unlink
- `subsc` — subscription verification

**Example output:**

```json
{"level":30,"time":1776094877745,"cat":"auth","msg":"Login success"}
{"level":40,"time":1776094877745,"cat":"auth","msg":"Login failed: invalid credentials"}
{"level":50,"time":1776094877745,"cat":"plaid","err":{"type":"Error","message":"Connection refused","stack":"..."},"msg":"Sync error"}
```

**Human-readable output** (development):

```bash
npm run dev | npx pino-pretty
```

## Docker

```bash
# Build from repo root
docker build -f apps/plaid-server/Dockerfile -t plaid-server .

# Test locally
docker run --rm -p 3001:3001 --env-file apps/plaid-server/.env plaid-server
```

## Production Deployment

### Docker Compose

```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: plaid-db
    restart: always
    environment:
      POSTGRES_DB: plaid
      POSTGRES_USER: plaid
      POSTGRES_PASSWORD: <your_password>
    volumes:
      - /apps/plaid-server/data:/var/lib/postgresql/data

  plaid-server:
    image: kamarkaka4/plaid-server:latest
    container_name: plaid-server
    restart: always
    depends_on:
      - postgres
    ports:
      - 30015:3001
    env_file:
      - /apps/plaid-server/.env
    volumes:
      - /apps/plaid-server/logs:/var/log
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "10"

  db-backup:
    image: prodrigestivill/postgres-backup-local:latest
    container_name: db-backup
    restart: always
    depends_on:
      - postgres
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_DB: plaid
      POSTGRES_USER: plaid
      POSTGRES_PASSWORD: <your_password>
      SCHEDULE: "@every 6h"
      BACKUP_KEEP_DAYS: 7
      BACKUP_KEEP_WEEKS: 4
      BACKUP_KEEP_MONTHS: 6
    volumes:
      - /apps/plaid-server/backups/db:/backups
```

### Log Persistence

The container writes logs to `/var/log/plaid-server.log` via `tee`. Mount `/var/log` to a host directory to persist logs across container restarts.

**Host directory setup** (match container's plaid user UID 1001):

```bash
sudo mkdir -p /apps/plaid-server/logs
sudo chown -R 1001:1001 /apps/plaid-server/logs
```

**Log rotation** — create `/etc/logrotate.d/plaid-server` on the host:

```
/apps/plaid-server/logs/plaid-server.log {
    daily
    rotate 14
    compress
    missingok
    notifempty
    copytruncate
}
```

Test with `sudo logrotate -d /etc/logrotate.d/plaid-server` (dry-run). Logrotate runs automatically via daily cron.

### Database Backup

The `db-backup` service runs `pg_dump` on the configured schedule and stores backups at `/apps/plaid-server/backups/db/` on the host.

**Manual backup:**

```bash
docker exec db-backup /backup.sh
```

**Backup retention:** 7 daily, 4 weekly, 6 monthly (configurable via environment variables).

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Min 32 chars, used for signing JWTs |
| `PLAID_CLIENT_ID` | Yes | Plaid developer client ID |
| `PLAID_SECRET` | Yes | Plaid developer secret |
| `PLAID_ENV` | No | `sandbox` or `production` (default: `production`) |
| `PLAID_TOKEN_ENCRYPTION_KEY` | Yes | 64-char hex string (32 bytes) for AES-256-GCM |
| `APPLE_BUNDLE_ID` | No | iOS bundle ID for receipt verification |
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | Set to `production` to block `LOCAL_PRO` bypass |
| `LOG_LEVEL` | No | Pino log level (default: `info`) |
| `RL_*` | No | Rate limit overrides (see table above) |
