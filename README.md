# Money Tracker

A personal finance tracking app with two frontends (web + mobile) sharing code through a monorepo.

[![Build and Push Web Docker Image](https://github.com/kamarkaka/money-tracker-v2/actions/workflows/docker-publish-web.yml/badge.svg?branch=main)](https://github.com/kamarkaka/money-tracker-v2/actions/workflows/docker-publish-web.yml)
[![Build and Push Plaid Server Docker Image](https://github.com/kamarkaka/money-tracker-v2/actions/workflows/docker-publish-plaid.yml/badge.svg?branch=main)](https://github.com/kamarkaka/money-tracker-v2/actions/workflows/docker-publish-plaid.yml)

## Monorepo Structure

```
apps/web/            — Next.js 16 web app (NextAuth, Prisma, PostgreSQL, Sophtron)
apps/mobile/         — Expo/React Native iOS app (local-first, SQLite, Plaid)
apps/plaid-server/   — Standalone Plaid backend service (Express, Prisma, PostgreSQL)
packages/shared/     — Types, constants, utilities shared across apps
packages/api-client/ — HTTP API client (interface contract for web and mobile)
packages/hooks/      — React hooks wrapping api-client
```

## Tech Stack

| App | Framework | Database | Bank Aggregation |
|-----|-----------|----------|------------------|
| **Web** | Next.js 16, React 19, Tailwind CSS 4 | PostgreSQL + Prisma | Sophtron |
| **Mobile** | Expo (SDK 55), React Native 0.83 | SQLite (on-device) | Plaid (direct or via backend) |
| **Plaid Server** | Express 5 | PostgreSQL + Prisma | Plaid |

- **Auth:** NextAuth.js (web), JWT via `jose` (mobile + plaid server)
- **Language:** TypeScript across all packages
- **Monorepo:** npm workspaces

## Features

### Web App
- Register/login (email + Google OAuth)
- Institution linking via Sophtron (search, connect, MFA, refresh)
- Account management with balances and net worth
- Transaction sync, filtering, search, and re-categorization
- Two-level category hierarchy (parent/sub-category)
- Budget buckets with spending tracking
- Category rules for auto-categorization
- Tags for transaction labeling
- Monthly overview dashboard
- Internationalization (English, Spanish, French)

### Mobile App (iOS)
- Local-first architecture — all data in on-device SQLite
- Two Plaid modes:
  - **Direct:** user provides own Plaid credentials, app calls Plaid API directly
  - **Backend:** user authenticates with Plaid server, server manages Plaid on their behalf
- Freemium model (Casual vs Pro) via in-app purchase
- Customizable bottom tab bar (Pro)
- Emoji-based or hierarchical category picker
- Budget progress cards with net savings
- Auto-categorization rules
- Tags, export/import (ZIP of CSVs)
- Internationalization (English, Chinese)

### Plaid Backend Service
- Standalone Express server for users without their own Plaid credentials
- User registration/login with JWT auth
- Apple subscription verification (JWS + client attestation fallback)
- Plaid link token creation, token exchange, and transaction sync
- Encrypted access token storage (AES-256-GCM)
- Quota system: 300 points/month, 30/link, 13/refresh, 1 free refresh/month per institution, 24h cooldown

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL (for web app and plaid server)

### Web App

```bash
npm install
cp apps/web/.env.example apps/web/.env.local   # configure DATABASE_URL, auth, Sophtron keys
cd apps/web
npx prisma generate
npx prisma migrate dev
cd ../..
npm run dev
```

### Plaid Server

```bash
cp apps/plaid-server/.env.example apps/plaid-server/.env   # configure DATABASE_URL, Plaid keys
cd apps/plaid-server
npx prisma generate
npx prisma db push
npm run dev                                                 # starts on port 3001
```

### Mobile App

```bash
cd apps/mobile
npx expo start                        # Expo dev server
npx expo run:ios -d "DEVICE_NAME"     # build and run on iOS device/simulator
```

## Docker

Both server apps have Docker images published to Docker Hub via GitHub Actions (daily + manual dispatch):

```bash
# Web app
docker build -f apps/web/Dockerfile -t money-tracker-web .

# Plaid server
docker build -f apps/plaid-server/Dockerfile -t plaid-server .
```

## License

See [LICENSE](LICENSE).
