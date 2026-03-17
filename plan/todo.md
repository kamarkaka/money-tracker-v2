# TODO List

## Fixes

Things that are currently broken or produce incorrect behavior.

| # | Task | Priority | Details |
|---|------|----------|---------|
| F1 | Remove sensitive data from console.log | HIGH | `register/route.ts` logs password hashes. `backfill/route.ts` logs sophtron IDs, transaction data, and returns `sophtronCustomerId` in the API response. `sophtron/client.ts:172` logs MFA/challenge answers. These leak secrets to log aggregators. |
| F2 | Fix double-fetch on transaction filter change | HIGH | `TransactionPage` useEffect depends on `filters`, but `handleFilter` also calls `fetchTransactions` manually. Every filter change triggers two API calls. Remove the manual call or decouple the useEffect. |
| F3 | Fix net worth calculation for overdrafts | HIGH | `AccountPage` uses `Math.abs(bal)` for assets, which treats negative checking balances (overdrafts) as positive assets. Should use the raw signed value. |
| F4 | Fix missing ownership checks on categoryId | HIGH | `transaction/route.ts` (POST), `transaction/[id]/route.ts` (PUT), and all `budget-buckets` routes accept `categoryId`/`categoryIds` without verifying they belong to the authenticated user. A user could reference another user's categories. |
| F5 | Fix missing ownership check on accountId in transaction PUT | HIGH | `transaction/[id]/route.ts` allows reassigning a manual transaction to any accountId without checking ownership. |
| F6 | Add password strength validation to register and reset-password | HIGH | `register/route.ts` and `reset-password/route.ts` accept any password length. `profile/route.ts` enforces 6-char minimum but these two don't. |
| F7 | Fix EditCategoryModal render-time setState | MEDIUM | Uses a render-time side effect (`if (category && name === "" && !loading)`) instead of useEffect to reset form state. This is fragile and triggers setState during render. |
| F8 | Fix AddTransactionModal stale state on reopen | MEDIUM | Form state (accountId, isExpense) persists across close/reopen because reset only happens on successful submit, not on open. |
| F9 | Fix BucketTransactionList non-standard Tailwind classes | MEDIUM | Uses `w-8/100`, `w-42/100`, etc. which are not standard Tailwind utilities. These likely produce no styling and the columns will have broken widths. |
| F10 | Fix budget-buckets PUT race condition | MEDIUM | `budget-buckets/[id]/route.ts` deletes then recreates budget categories without a Prisma transaction. Concurrent requests can cause inconsistent state. |
| F11 | Fix forgot-password email error breaking anti-enumeration | MEDIUM | If `sendPasswordResetEmail` throws, it returns a 500 for existing emails but 200 for non-existent ones, leaking whether an email is registered. |
| F12 | Fix CreateCategoryForm error display layout | LOW | Error `<p>` is a sibling in a flex row with `items-end gap-3`, rendering inline next to the button instead of below the form. |
| F13 | Fix CSV import `parseAmount` returning 0 for invalid values | LOW | `parseAmount` returns 0 for unparseable values instead of signaling a skip. This silently creates $0 transactions. |
| F14 | Fix profile page shared success/error messages | LOW | `message` and `error` state is shared between profile form and password form. Saving one clears feedback from the other. |
| F15 | Fix `getMonthRange` end-of-month boundary | LOW | `utils.ts` `getMonthRange` returns midnight on the last day. Depending on query operator (`<` vs `<=`), transactions on the last day may be excluded. |

## Changes

Improvements to existing functionality.

| # | Task | Priority | Details |
|---|------|----------|---------|
| C1 | Add error handling to all API fetch calls | HIGH | Nearly every dashboard page (`overview`, `account`, `budget`, `category`, `transaction`, `profile`) has zero error handling on fetch calls. Failures result in infinite spinners or silent data loss. Add try/catch with user-visible error messages. |
| C2 | Add try/catch around `request.json()` in all API routes | HIGH | All POST/PUT routes call `await request.json()` without try/catch. Malformed JSON causes unhandled 500 errors instead of a user-friendly 400 response. |
| C3 | Add try/catch around Prisma operations in API routes | HIGH | Most routes lack error handling for database failures. DB errors produce unhandled 500s with no useful message. |
| C4 | Use async bcrypt (`compare`/`hash`) instead of sync variants | MEDIUM | `auth.ts`, `profile/route.ts`, `register/route.ts`, `reset-password/route.ts` use `compareSync`/`hashSync` which block the Node.js event loop. |
| C5 | Add debounce to transaction search filter | MEDIUM | `TransactionFilters` fires an API call on every keystroke. Add 300ms debounce on the search input. |
| C6 | Add "Clear Filters" button to TransactionFilters | MEDIUM | No way to reset all filters at once. Users must manually clear each field. |
| C7 | Add request timeout to Sophtron API calls | MEDIUM | `base-client.ts` fetch calls have no timeout. A hung Sophtron response blocks indefinitely. Use `AbortSignal.timeout()`. |
| C8 | Add `output: "standalone"` to Next.js config + update Dockerfile | MEDIUM | Currently copies entire `node_modules` into the Docker image. Standalone output reduces image size from ~500MB to ~100MB. |
| C9 | Move `prisma` CLI to devDependencies | MEDIUM | `prisma` is a build-time tool listed in production `dependencies`. Only `@prisma/client` and the adapter belong there. |
| C10 | Use `createMany` for CSV import instead of sequential creates | MEDIUM | `transaction/import/route.ts` creates records one at a time in a loop. `createMany` would be significantly faster for large files. |
| C11 | Add row limit to CSV import | MEDIUM | No cap on `rows.length`. A client could send millions of rows, causing memory exhaustion and long-running transactions. |
| C12 | Use Prisma `upsert` for backfill instead of find-then-create | MEDIUM | `backfill/route.ts` does 2 queries per transaction (findFirst + create/update). `upsert` would halve the query count. |
| C13 | Make UncategorizedSection collapsible | LOW | Unlike BucketCard, the uncategorized section is always expanded. Should be collapsible like other bucket cards. |
| C14 | Add `onDelete: Cascade` to all User relations | LOW | `Institution.user`, `Account.user`, `Category.user`, `Budget.user`, `Transaction.user` lack `onDelete` behavior. Deleting a user fails on FK constraints. The purge route works around this, but the schema should be consistent. |
| C15 | Add email format validation to register, profile, forgot-password | LOW | These endpoints only check for non-empty email, not valid format. |
| C16 | Add input validation for `pageSize` in transaction GET | LOW | No upper bound on `pageSize`. A client could request `pageSize=999999` to dump all records. |
| C17 | Add security headers in next.config.ts | LOW | No CSP, X-Frame-Options, or other security headers configured. |
| C18 | Add `no-console` ESLint rule | LOW | Would catch accidental `console.log` of sensitive data. Also exclude `app/generated/**` from linting. |
| C19 | Remove dead code: AddInstitutionModal and RefreshButton | LOW | `AddInstitutionModal.tsx` and `RefreshButton.tsx` are not imported anywhere. Superseded by `ConnectInstitutionModal` and inline refresh in `InstitutionCard`. |
| C20 | Hardcoded `en-US` locale in formatCurrency/formatDate | LOW | `utils.ts` hardcodes locale. Should accept a locale parameter or use user settings, especially given the internationalization plan. |

## New Features

New functionality the app does not have yet.

| # | Task | Priority | Details |
|---|------|----------|---------|
| N1 | Transaction table sorting | HIGH | Users cannot sort by date, amount, description, or account. Add clickable column headers with ascending/descending sort. |
| N2 | Budget progress visualization | HIGH | Budget amounts exist but there's no visual indicator of spending vs. budget. Add progress bars to BucketCard and/or the budget page. |
| N3 | Net savings display on overview | MEDIUM | MonthlySummaryHeader shows income and expenses but not the net (income - expenses). This is a key metric users expect. |
| N4 | Bulk transaction categorization | MEDIUM | Users can only categorize transactions one at a time. Add checkbox selection and a "Categorize Selected" action. |
| N5 | Rate limiting on auth endpoints | MEDIUM | No rate limiting on register, login, forgot-password, reset-password. Vulnerable to brute-force and email flooding. |
| N6 | Recurring transactions | MEDIUM | No way to mark or auto-generate recurring transactions (rent, subscriptions, etc.). |
| N7 | Multi-currency support | LOW | All amounts are implicitly USD. The `Account` model has a `currency` field but it's never used in the UI. Display and handle different currencies. |
| N8 | Mobile-responsive layout for account page | LOW | Action buttons in the account page header overflow on small screens. Add responsive wrapping or a dropdown menu. |
| N9 | Keyboard accessibility improvements | LOW | `EditableName` is not keyboard-navigable (no role, tabIndex, or key handler). `AccountRow` hide button is invisible until hover. `TransactionCategoryEditor` dropdown lacks ARIA attributes. `TutorialOverlay` doesn't trap focus. |
| N10 | Data export for categories and budgets | LOW | Only transactions have CSV export. Allow exporting category and budget configuration for backup/migration. |
| N11 | Undo for destructive actions | LOW | No undo for delete, hide, or purge. Consider a toast with an undo option for reversible actions (hide, categorize, delete manual transaction). |
| N12 | Duplicate category/budget name prevention | LOW | No unique constraint on category or budget names per user. Users can create duplicates which confuse CSV import name matching. |
