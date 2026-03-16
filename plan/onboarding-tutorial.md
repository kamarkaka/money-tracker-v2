# Onboarding Tutorial — Implementation Plan

## Overview

A multi-step onboarding wizard for new users (both credentials and Google sign-in). The tutorial is fully optional — users can skip individual steps or quit entirely at any point. It appears as a full-screen overlay on top of the dashboard.

---

## 1. Detecting New Users & Triggering the Tutorial

### Database Change

Add a `hasCompletedTutorial` column to the `user` table:

```diff
 model User {
   ...
+  hasCompletedTutorial Boolean @default(false) @map("has_completed_tutorial")
   ...
 }
```

Migration SQL:
```sql
ALTER TABLE "user" ADD COLUMN "has_completed_tutorial" BOOLEAN NOT NULL DEFAULT false;
```

Existing users get `false` by default but we won't force the tutorial on them — only trigger it for users who have zero categories AND `hasCompletedTutorial = false` (a reasonable proxy for "brand new").

### API

**`GET /api/profile`** — include `hasCompletedTutorial` in the response.

**`PUT /api/tutorial/complete`** — new endpoint. Sets `hasCompletedTutorial = true` for the current user. Called when the user either completes or skips the tutorial.

### Trigger Logic

In the dashboard layout (`app/(dashboard)/layout.tsx`), after auth check:
- Fetch user profile server-side.
- If `hasCompletedTutorial === false` AND user has zero categories, redirect to `/tutorial` (or pass a prop to render the tutorial overlay).

Better approach: use a client-side check in `AppShell` — fetch `/api/profile` and if the tutorial hasn't been completed, render the `<TutorialOverlay />` component. This avoids a hard redirect and lets the tutorial overlay the dashboard naturally.

---

## 2. Tutorial Architecture

### Component Structure

```
app/components/tutorial/
  TutorialOverlay.tsx      — full-screen overlay container, manages step state
  TutorialProgress.tsx     — step indicator (dots/progress bar) + skip/quit buttons
  steps/
    WelcomeStep.tsx        — step 1: animated welcome message
    PageTourStep.tsx       — step 2: page-by-page overview (sub-steps inside)
    CategorySetupStep.tsx  — step 3: default category list with edit/accept
    BudgetSetupStep.tsx    — step 4: budget creation from accepted categories
    BankLinkStep.tsx       — step 5: link bank accounts via Sophtron
    CompletionStep.tsx     — step 6: congratulations + redirect
```

### State Management

`TutorialOverlay` maintains:
- `currentStep: number` (0–5)
- `isVisible: boolean`

Navigation:
- "Next" / "Continue" advances to the next step.
- "Skip" on any step advances to the next step without performing the action.
- "Skip Tutorial" / "X" button quits entirely — calls `PUT /api/tutorial/complete` and dismisses the overlay.

---

## 3. Step Details

### Step 1: Welcome (WelcomeStep.tsx)

- Full-screen centered card with animated content.
- **Animation**: CSS keyframes (no new library needed). Fade-in + slide-up for the welcome message, then staggered fade-in for instruction text.
  - Use Tailwind's `animate-` utilities with custom keyframes defined in `app/globals.css`.
- Content:
  - App logo (reuse `/logo.png`)
  - "Welcome to Money Tracker 2!" (large heading, animated)
  - Brief paragraph: "Let's get you set up in a few quick steps. You can skip any step or quit at any time."
  - "Let's Go" button + "Skip Tutorial" link

### Step 2: Page Tour (PageTourStep.tsx)

A carousel/slideshow walking through each page. Each slide shows:
- Page name and icon
- 2–3 bullet points describing what the page does
- A screenshot or illustration (optional — can use a styled card with icon instead)

**Page sequence** (ordered for logical understanding):

1. **Category** — "Organize your transactions into categories like Groceries, Rent, Entertainment. Categories can have subcategories for finer tracking."
2. **Budget** — "Create budget buckets with monthly spending limits. Assign categories to each bucket to track spending against your goals."
3. **Account** — "Link your bank accounts to automatically import transactions. View balances and net worth at a glance."
4. **Transaction** — "See all your transactions in one place. Filter by date, account, category, or amount. Assign categories to keep things organized."
5. **Overview** — "Your monthly dashboard. See income vs. expenses, spending by budget bucket, and quickly categorize transactions."

Each slide has "Back" and "Next" buttons within the sub-step. The outer tutorial "Skip" still works.

### Step 3: Category Setup (CategorySetupStep.tsx)

- Present a **default category list** with parent/child structure:

```
Essentials
  ├── Groceries
  ├── Rent / Mortgage
  ├── Utilities
  ├── Insurance
  └── Healthcare

Transportation
  ├── Gas
  ├── Public Transit
  └── Car Maintenance

Food & Dining
  ├── Restaurants
  ├── Coffee Shops
  └── Fast Food

Entertainment
  ├── Streaming Services
  ├── Movies & Events
  └── Hobbies

Shopping
  ├── Clothing
  ├── Electronics
  └── Home & Garden

Personal
  ├── Education
  ├── Fitness
  └── Personal Care

Kids & Family
  ├── Childcare / Daycare
  ├── School Supplies & Tuition
  ├── Kids Activities
  ├── Kids Clothing
  └── Baby Supplies

Income
  ├── Salary
  ├── Freelance
  └── Investments

Transfer
```

- UI: A checklist/tree view. Each category has a checkbox (all checked by default). Users can:
  - Uncheck categories they don't want.
  - Add new categories via an inline "Add category" input at the bottom of each parent group and at the top level.
  - Rename categories by clicking on the name (inline edit).
- "Accept & Create" button: calls `POST /api/category` for each selected category (parents first, then children with `parentId`).
  - Batch creation: add a new **`POST /api/categories/batch`** endpoint that accepts an array and creates them in a transaction.
- "Skip" link: advances without creating categories.

### Step 4: Budget Setup (BudgetSetupStep.tsx)

- Only shown if the user accepted categories in step 3 (otherwise auto-skipped — budgets need categories).
- Present suggested budget buckets based on the parent categories created:
  - Each parent category becomes a suggested bucket.
  - Default amounts are left blank (user fills in).
- UI: A list of suggested buckets, each with:
  - Bucket name (editable, pre-filled with parent category name)
  - Monthly amount input (number, required to include the bucket)
  - Assigned categories shown as pills (pre-assigned based on the parent-child relationship from step 3)
  - Checkbox or toggle to include/exclude the bucket
- "Create Budgets" button: calls `POST /api/budget-buckets` for each included bucket.
  - Or add a **`POST /api/budget-buckets/batch`** endpoint.
- "Skip" link: advances without creating budgets.

### Step 5: Bank Link (BankLinkStep.tsx)

- Reassurance message: "Link your bank accounts to automatically import transactions. **We never store your bank login credentials** — they are securely handled by our banking partner."
- A prominent "Link a Bank Account" button that opens the existing `ConnectInstitutionModal`.
- After successful connection, show a success message with the number of accounts synced.
- Users can link multiple institutions (show "Link Another" button after first success).
- "Skip" link is clearly visible with supportive text: "You can always link accounts later from the Accounts page."

### Step 6: Completion (CompletionStep.tsx)

- Animated congratulations message (similar animation style as welcome step).
- Content:
  - Checkmark or celebration icon (can use Heroicons `CheckCircleIcon` or a simple CSS animation)
  - "You're all set!" heading
  - Summary of what was set up: "X categories created, Y budgets configured, Z accounts linked" (pull from what happened in previous steps)
  - "Go to Overview" button — calls `PUT /api/tutorial/complete`, then navigates to `/overview`.

---

## 4. New API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `PUT` | `/api/tutorial/complete` | Set `hasCompletedTutorial = true` |
| `POST` | `/api/categories/batch` | Create multiple categories in one request (parents first, then children) |
| `POST` | `/api/budget-buckets/batch` | Create multiple budget buckets in one request |

### `POST /api/categories/batch`

Request body:
```json
{
  "categories": [
    { "name": "Essentials", "children": ["Groceries", "Rent / Mortgage", "Utilities"] },
    { "name": "Transportation", "children": ["Gas", "Public Transit"] },
    { "name": "Transfer" }
  ]
}
```

Implementation: within a Prisma `$transaction`, create parents first, collect their IDs, then create children with `parentId` set.

### `POST /api/budget-buckets/batch`

Request body:
```json
{
  "buckets": [
    { "name": "Essentials", "amount": 1500, "categoryIds": ["uuid1", "uuid2"] },
    { "name": "Transportation", "amount": 300, "categoryIds": ["uuid3"] }
  ]
}
```

Implementation: within a Prisma `$transaction`, validate no category conflicts, then create all buckets with their BudgetCategory rows.

---

## 5. CSS Animations

Add custom keyframes to `app/globals.css` (no new dependencies):

```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
```

Use with Tailwind arbitrary values: `animate-[fade-in-up_0.6s_ease-out]`, or define utility classes.

Staggered entrance: apply increasing `animation-delay` via inline styles on child elements.

---

## 6. File Changes Summary

| Area | File | Change |
|------|------|--------|
| **Schema** | `prisma/schema.prisma` | Add `hasCompletedTutorial` column |
| **Migration** | `prisma/migrations/2026XXXX_add_tutorial_flag/` | Migration SQL |
| **Profile API** | `app/api/profile/route.ts` | Include `hasCompletedTutorial` in GET response |
| **New API** | `app/api/tutorial/complete/route.ts` | PUT to mark tutorial complete |
| **New API** | `app/api/categories/batch/route.ts` | POST to batch-create categories |
| **New API** | `app/api/budget-buckets/batch/route.ts` | POST to batch-create budgets |
| **CSS** | `app/globals.css` | Add fade/slide animation keyframes |
| **New component** | `app/components/tutorial/TutorialOverlay.tsx` | Main overlay container |
| **New component** | `app/components/tutorial/TutorialProgress.tsx` | Progress indicator + navigation |
| **New component** | `app/components/tutorial/steps/WelcomeStep.tsx` | Welcome animation |
| **New component** | `app/components/tutorial/steps/PageTourStep.tsx` | Page-by-page overview carousel |
| **New component** | `app/components/tutorial/steps/CategorySetupStep.tsx` | Default category list editor |
| **New component** | `app/components/tutorial/steps/BudgetSetupStep.tsx` | Budget bucket setup |
| **New component** | `app/components/tutorial/steps/BankLinkStep.tsx` | Bank account linking |
| **New component** | `app/components/tutorial/steps/CompletionStep.tsx` | Congratulations + redirect |
| **Modified** | `app/components/layout/AppShell.tsx` | Check tutorial status, render overlay |

---

## 7. Design Decisions

1. **Overlay vs. separate page**: Using an overlay on the dashboard so the app feels alive underneath. The overlay uses a semi-transparent backdrop with a centered card.

2. **No new dependencies**: CSS animations are sufficient for the welcome/completion steps. No need for framer-motion given the simple animation requirements.

3. **Batch APIs**: Creating categories and budgets one-by-one would cause N+1 API calls and flickering. Batch endpoints make the setup feel instant.

4. **Auto-skip budget step**: If the user skips category setup, the budget step is auto-skipped since budgets require categories. The completion step adjusts its summary accordingly.

5. **Re-triggering**: Once `hasCompletedTutorial` is set to true (by completing OR skipping), the tutorial never shows again. There is no "restart tutorial" feature in this plan (could be added later in Settings).

6. **Existing users**: The `hasCompletedTutorial` column defaults to `false`, but the trigger logic also checks for zero categories. Existing users who already have categories won't see the tutorial.
