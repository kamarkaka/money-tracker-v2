![Logo](public/logo.png)

# Money Tracker

A personal finance tracking application built with Next.js, PostgreSQL, and the Sophtron API.

[![Build and Push Docker Image](https://github.com/kamarkaka/money-tracker-v2/actions/workflows/docker-publish.yml/badge.svg?branch=main)](https://github.com/kamarkaka/money-tracker-v2/actions/workflows/docker-publish.yml)

## Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth.js (credentials-based)
- **Financial Data:** Sophtron API
- **Email:** Nodemailer (SMTP)

## Features

- **Authentication** — Register, log in, and forgot/reset password via email
- **Institution Linking** — Connect bank accounts via Sophtron (search, connect, refresh)
- **Account Management** — View linked accounts, balances, and net worth
- **Transaction Sync** — Automatic transaction import on connection/refresh (current month), plus a full backfill option (12 months)
- **Categories** — Two-level category hierarchy (parent/sub-category)
- **Budgets** — Group categories into budget buckets to track spending
- **Overview Dashboard** — Monthly summary with income/spending breakdown by budget bucket
- **Transaction Management** — Filter, search, and re-categorize transactions

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL
- A Sophtron API account (for financial data aggregation)

### Setup from Archive

If you received this project as a zip archive (`money-tracker-2.zip`):

```bash
unzip money-tracker-2.zip -d money-tracker-2
cd money-tracker-2
yarn install                # install dependencies
npx prisma generate         # generate Prisma client
```

Then create your database and apply migrations:

```bash
createdb money_tracker
npx prisma migrate dev
```

Optionally restore the included database backup:

```bash
psql money_tracker < money_tracker_backup.sql
```

Then continue with step 2 below to configure your `.env` file.

### Setup from Source

1. Clone the repo and install dependencies:

```bash
yarn install
```

2. Create a `.env` file with the following variables:

```env
DATABASE_URL="postgresql://user@localhost:5432/money_tracker?schema=public"
AUTH_SECRET="your-auth-secret"

SOPHTRON_BASE_URL="https://api.sophtron.com/"
SOPHTRON_USER_ID="your-sophtron-user-id"
SOPHTRON_ACCESS_KEY="your-sophtron-access-key"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="your-email@gmail.com"
APP_URL="http://localhost:3000"
```

3. Generate the Prisma client and run migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

4. Start the development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building the Archive

To create a deployable zip archive (only includes essential source files):

```bash
zip -r money-tracker-2.zip \
  app/ \
  prisma/ \
  public/ \
  .gitignore \
  DESIGN.md \
  eslint.config.mjs \
  money_tracker_backup.sql \
  next.config.ts \
  package.json \
  postcss.config.mjs \
  prisma.config.ts \
  README.md \
  tsconfig.json \
  -x "app/generated/*"
```

## Project Structure

```
app/
├── (auth)/              # Login, register, forgot/reset password pages
├── (dashboard)/         # Authenticated pages (overview, account, budget, category, transaction)
├── api/                 # API routes
├── components/          # Reusable UI components
├── lib/                 # Server utilities (auth, db, email, sophtron client)
└── prisma/              # Prisma schema and migrations
```
