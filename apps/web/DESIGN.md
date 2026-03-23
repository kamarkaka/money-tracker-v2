# Money Tracker — Design Document

## Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** NextAuth.js (credentials-based, email + password)
- **Financial Data Aggregation:** Sophtron API
- **State/Data Fetching:** React Server Components + Server Actions (no extra client-state library needed initially)

---

## 1. Database Schema

### 1.1 `user`

| Column | Type | Constraints |
|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL |
| `password_hash` | `VARCHAR(255)` | NOT NULL |
| `name` | `VARCHAR(100)` | |
| `sophtron_customer_id` | `UUID` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` |

**Indexes:** `UNIQUE(email)`

---

### 1.2 `institution`

Represents a linked financial institution (bank, credit card provider, etc.).

| Column | Type | Constraints |
|---|---|---|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK → `user.id`, NOT NULL |
| `sophtron_member_id` | `UUID` | NOT NULL |
| `name` | `VARCHAR(255)` | NOT NULL |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` |

**Indexes:** `(user_id)`

---

### 1.3 `account`

A single account within an institution (e.g. checking, savings, credit card).

| Column | Type | Constraints |
|---|---|---|
| `id` | `UUID` | PK |
| `institution_id` | `UUID` | FK → `institution.id` ON DELETE CASCADE, NOT NULL |
| `user_id` | `UUID` | FK → `user.id`, NOT NULL |
| `sophtron_account_id` | `UUID` | NOT NULL |
| `sophtron_member_id` | `UUID` | NOT NULL |
| `name` | `VARCHAR(255)` | NOT NULL |
| `type` | `VARCHAR(50)` | NOT NULL (e.g. `checking`, `savings`, `credit_card`, `investment`) |
| `subtype` | `VARCHAR(50)` | NULLABLE |
| `balance` | `DECIMAL(14,2)` | NOT NULL, default `0` |
| `currency` | `VARCHAR(3)` | NOT NULL, default `'USD'` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` |

**Indexes:** `(institution_id)`, `(user_id)`

---

### 1.4 `category`

Two-level hierarchy: parent category and sub-category.

| Column | Type | Constraints |
|---|---|---|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK → `user.id`, NOT NULL |
| `name` | `VARCHAR(100)` | NOT NULL |
| `parent_id` | `UUID` | FK → `category.id` ON DELETE CASCADE, NULLABLE |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` |

**Constraints:**
- A row with `parent_id = NULL` is a **parent category**.
- A row with `parent_id IS NOT NULL` is a **sub-category**.
- A sub-category cannot itself be a parent (enforced at application level: reject inserts where `parent_id` points to a row whose own `parent_id` is not null).

**Indexes:** `(user_id)`, `(parent_id)`

---

### 1.5 `budget`

A named grouping of category for budgeting.

| Column | Type | Constraints |
|---|---|---|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK → `user.id`, NOT NULL |
| `name` | `VARCHAR(100)` | NOT NULL |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` |

**Indexes:** `(user_id)`

---

### 1.6 `budget_category`

Join table: maps categories to budgets. **A category can belong to at most one bucket** (enforced by unique constraint on `category_id`).

| Column | Type | Constraints |
|---|---|---|
| `id` | `UUID` | PK |
| `budget_bucket_id` | `UUID` | FK → `budget.id` ON DELETE CASCADE, NOT NULL |
| `category_id` | `UUID` | FK → `category.id` ON DELETE CASCADE, NOT NULL, **UNIQUE** |

**Indexes:** `(budget_bucket_id)`, `UNIQUE(category_id)`

---

### 1.7 `transaction`

| Column | Type | Constraints |
|---|---|---|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK → `user.id`, NOT NULL |
| `account_id` | `UUID` | FK → `account.id` ON DELETE CASCADE, NOT NULL |
| `category_id` | `UUID` | FK → `category.id` ON DELETE SET NULL, NULLABLE |
| `sophtron_transaction_id` | `VARCHAR(255)` | NULLABLE (for dedup during refresh) |
| `description` | `VARCHAR(500)` | NOT NULL |
| `amount` | `DECIMAL(14,2)` | NOT NULL (positive = income, negative = expense) |
| `date` | `DATE` | NOT NULL |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` |

**Indexes:** `(user_id, date)`, `(account_id)`, `(category_id)`, `(sophtron_transaction_id)` — for dedup lookups

---

### ER Diagram (text)

```
user 1──* institution 1──* account 1──* transaction
user 1──* category (self-ref parent_id)
user 1──* budget 1──* budget_category *──1 category
transaction *──1 category
```

---

## 2. Page-by-Page UI Components

### 2.1 Shared / Global Components

These components are used across multiple pages:

| Component | Description |
|---|---|
| `AppShell` | top bar + main content area. Wraps all authenticated pages. |
| `Topbar` | Navigation links: Overview, Account, Budget, Category, Transaction. Shows user name & logout. |
| `MonthPicker` | Month/year selector with prev/next arrows. Used on Overview page (and potentially Transaction page). |
| `Modal` | Generic modal dialog container for create/edit/delete confirmations. |
| `DataTable` | Reusable sortable, filterable table. Used on transaction, account, and within Overview buckets. |
| `EmptyState` | Placeholder when no data exists yet (e.g. no transaction, no account). |
| `ConfirmDialog` | "Are you sure?" confirmation prompt for destructive actions (delete institution, delete category, etc.). |
| `FormField` | Reusable labeled input/select with error message display. |
| `Badge` | Small colored label for account types, category names, etc. |
| `CurrencyDisplay` | Formats a number as currency (e.g. `$1,234.56`). |
| `LoadingSpinner` | Spinner shown during async operations. |

---

### 2.2 Auth Pages (`/login`, `/register`)

| Component | Description |
|---|---|
| `AuthLayout` | Centered card layout for login/register forms. |
| `LoginForm` | Email + password fields, submit button, link to register. |
| `RegisterForm` | Name + email + password + confirm password, submit button, link to login. |

---

### 2.3 Overview Page (`/overview`)

| Component | Description |
|---|---|
| `MonthPicker` | *(shared)* Select which month to view. |
| `MonthlySummaryHeader` | Shows total income and total spending for the selected month. |
| `BucketCard` | Card for one budget bucket: bucket name, total amount, expandable transaction list. |
| `BucketTransactionList` | List of transaction within a bucket. Each row shows date, description, amount, category. |
| `TransactionCategoryEditor` | Inline dropdown or modal to reassign a transaction's category. On change, the transaction automatically moves to the correct bucket. |
| `UncategorizedSection` | Special section for transaction not belonging to any bucket (their category is unassigned or not mapped to a bucket). |

---

### 2.4 account Page (`/account`)

| Component | Description |
|---|---|
| `InstitutionCard` | Card per institution: institution name, list of account, refresh & remove buttons. |
| `AccountRow` | Single account row inside an InstitutionCard: account name, type badge, balance. |
| `AddInstitutionModal` | Modal to search and link a new institution via Sophtron. |
| `RefreshButton` | Button that triggers a manual sync of an institution's account and transaction. Shows loading state. |
| `ConfirmDialog` | *(shared)* Confirm institution removal. |

---

### 2.5 Budget Page (`/budget`)

| Component | Description |
|---|---|
| `BucketList` | List of all budget buckets for the user. |
| `BucketEditor` | Expandable/modal view to edit a bucket: rename, add/remove category. |
| `CategoryPicker` | Multi-select of available category (only shows category not already assigned to another bucket). |
| `CreateBucketForm` | Form to create a new bucket with a name and initial set of category. |
| `ConfirmDialog` | *(shared)* Confirm bucket deletion. |

---

### 2.6 category Page (`/category`)

| Component | Description |
|---|---|
| `CategoryTree` | Hierarchical list showing parent category with nested sub-category. |
| `CategoryRow` | Single row in the tree: name, edit/delete actions. Sub-category are indented under parents. |
| `CreateCategoryForm` | Form to add a new category. Has a parent dropdown (optional — leave blank for a parent category). |
| `EditCategoryModal` | Modal to rename a category or change its parent. |
| `ConfirmDialog` | *(shared)* Confirm category deletion (warns if transaction are assigned to it). |

---

### 2.7 transaction Page (`/transaction`)

| Component | Description |
|---|---|
| `TransactionFilters` | Filter bar: date range, account, category, amount range, search text. |
| `DataTable` | *(shared)* Table displaying filtered transaction: date, description, account, category, amount. |
| `TransactionCategoryEditor` | *(shared, same as Overview)* Inline category reassignment. |

---

## 3. Proposed File Structure

```
app/
├── layout.tsx                          # Root layout (html, body, fonts, global providers)
├── globals.css                         # Tailwind + global styles
├── page.tsx                            # Landing page (redirects to /overview if logged in, else /login)
│
├── (auth)/                             # Route group for unauthenticated pages
│   ├── layout.tsx                      # AuthLayout — centered card layout
│   ├── login/
│   │   └── page.tsx                    # Login page
│   └── register/
│       └── page.tsx                    # Register page
│
├── (dashboard)/                        # Route group for authenticated pages
│   ├── layout.tsx                      # AppShell — sidebar + top bar + auth guard
│   ├── overview/
│   │   └── page.tsx                    # Overview page
│   ├── account/
│   │   └── page.tsx                    # account page
│   ├── budget/
│   │   └── page.tsx                    # Budget page
│   ├── category/
│   │   └── page.tsx                    # category page
│   └── transaction/
│       └── page.tsx                    # transaction page
│
├── api/                                # API route handlers
│   ├── auth/
│   │   └── [...nextauth]/
│   │       └── route.ts                # NextAuth catch-all route
│   ├── institution/
│   │   ├── route.ts                    # GET (list), POST (add institution)
│   │   └── [id]/
│   │       ├── route.ts                # DELETE (remove institution)
│   │       └── refresh/
│   │           └── route.ts            # POST (sync institution data from Sophtron)
│   ├── account/
│   │   └── route.ts                    # GET (list account)
│   ├── category/
│   │   ├── route.ts                    # GET (list), POST (create)
│   │   └── [id]/
│   │       └── route.ts               # PUT (update), DELETE
│   ├── budget-buckets/
│   │   ├── route.ts                    # GET (list), POST (create)
│   │   └── [id]/
│   │       └── route.ts               # PUT (update), DELETE
│   └── transaction/
│       ├── route.ts                    # GET (list with filters)
│       └── [id]/
│           └── route.ts               # PUT (update category)
│
├── components/                         # Reusable UI components
│   ├── ui/                             # Generic primitives
│   │   ├── Modal.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── DataTable.tsx
│   │   ├── FormField.tsx
│   │   ├── Badge.tsx
│   │   ├── CurrencyDisplay.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── EmptyState.tsx
│   ├── layout/                         # Layout components
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   └── AuthLayout.tsx
│   ├── overview/                       # Overview-specific components
│   │   ├── MonthlySummaryHeader.tsx
│   │   ├── BucketCard.tsx
│   │   ├── BucketTransactionList.tsx
│   │   └── UncategorizedSection.tsx
│   ├── account/                       # account-specific components
│   │   ├── InstitutionCard.tsx
│   │   ├── AccountRow.tsx
│   │   ├── AddInstitutionModal.tsx
│   │   └── RefreshButton.tsx
│   ├── budget/                         # Budget-specific components
│   │   ├── BucketList.tsx
│   │   ├── BucketEditor.tsx
│   │   ├── CategoryPicker.tsx
│   │   └── CreateBucketForm.tsx
│   ├── category/                     # category-specific components
│   │   ├── CategoryTree.tsx
│   │   ├── CategoryRow.tsx
│   │   ├── CreateCategoryForm.tsx
│   │   └── EditCategoryModal.tsx
│   ├── transaction/                   # transaction-specific components
│   │   ├── TransactionFilters.tsx
│   │   └── TransactionCategoryEditor.tsx
│   └── MonthPicker.tsx                 # Shared month picker
│
├── lib/                                # Server-side utilities & business logic
│   ├── db.ts                           # Prisma client singleton
│   ├── auth.ts                         # NextAuth configuration
│   ├── sophtron.ts                     # Sophtron API client (fetch institution, account, transaction)
│   └── utils.ts                        # Shared helpers (currency formatting, date helpers)
│
└── prisma/
    ├── schema.prisma                   # Prisma schema (all models defined here)
    └── seed.ts                         # Optional: seed default category
```

---

## 4. Key Design Decisions

### 4.1 Transaction Sign Convention
Positive `amount` = income/deposit, negative `amount` = expense/withdrawal. This simplifies summing: `SUM(amount)` for a bucket gives net spending directly.

### 4.2 Category Uniqueness Across Buckets
The `UNIQUE(category_id)` constraint on `budget_category` ensures a category can only belong to one bucket at a time. When moving a category to a different bucket, the old mapping is deleted first.

### 4.3 Two-Level Category Hierarchy
Enforced by a self-referential `parent_id` on `category`. App-level validation prevents deeper nesting (a row pointed to by `parent_id` must itself have `parent_id = NULL`).

### 4.4 Sophtron Refresh Flow
1. User clicks Refresh on an institution.
2. Server calls Sophtron API to pull latest account and transaction.
3. account are upserted by `sophtron_account_id`.
4. transaction are upserted by `sophtron_transaction_id` — existing transaction are updated if changed, new ones are inserted, ensuring no duplicates.

### 4.5 Route Groups
- `(auth)` group: login/register pages share a centered-card layout, no sidebar.
- `(dashboard)` group: all authenticated pages share the AppShell layout with sidebar navigation. The layout checks for a valid session and redirects to `/login` if unauthenticated.

### 4.6 Overview Regrouping
When a user changes a transaction's category, the transaction automatically falls under the bucket that owns that category. If the new category isn't mapped to any bucket, the transaction appears in "Uncategorized." No explicit "move" action is needed — the bucket grouping is derived from the category → bucket mapping at query time.
