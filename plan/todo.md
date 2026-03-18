# TODO List

## Fixes

All fixes (F1–F15) have been completed.

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
| N6 | Recurring transactions | MEDIUM | No way to mark or auto-generate recurring transactions (rent, subscriptions, etc.). |
| N7 | Multi-currency support | LOW | All amounts are implicitly USD. The `Account` model has a `currency` field but it's never used in the UI. Display and handle different currencies. |
| N8 | Mobile-responsive layout for account page | LOW | Action buttons in the account page header overflow on small screens. Add responsive wrapping or a dropdown menu. |
| N9 | Keyboard accessibility improvements | LOW | `EditableName` is not keyboard-navigable (no role, tabIndex, or key handler). `AccountRow` hide button is invisible until hover. `TransactionCategoryEditor` dropdown lacks ARIA attributes. `TutorialOverlay` doesn't trap focus. |
| N10 | Data export for categories and budgets | LOW | Only transactions have CSV export. Allow exporting category and budget configuration for backup/migration. |
| N11 | Undo for destructive actions | LOW | No undo for delete, hide, or purge. Consider a toast with an undo option for reversible actions (hide, categorize, delete manual transaction). |
