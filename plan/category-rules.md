# Category Rules — Implementation Plan

## Overview

Allow users to define rules that automatically categorize transactions based on description matching. When a transaction is created (manual, CSV import, or Sophtron sync), the system checks its description against the user's rules and assigns the matching category.

## Data Model

### New table: `category_rule`

```prisma
model CategoryRule {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  sequence   Int      @default(0)
  match      String   @db.VarChar(255)
  categoryId String   @map("category_id") @db.Uuid
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  user     User     @relation(fields: [userId], references: [id])
  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@index([userId, sequence])
  @@map("category_rule")
}
```

- `sequence`: integer for ordering. Lower = higher priority. Rules are matched in ascending sequence order.
- `match`: case-insensitive substring to match against transaction descriptions.
- `categoryId`: the category to assign when the rule matches.

Add `rules CategoryRule[]` to the `User` and `Category` models.

### Migration

```sql
CREATE TABLE "category_rule" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "user"("id"),
  "sequence" INT NOT NULL DEFAULT 0,
  "match" VARCHAR(255) NOT NULL,
  "category_id" UUID NOT NULL REFERENCES "category"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX "category_rule_user_id_sequence_idx" ON "category_rule"("user_id", "sequence");
```

## API Endpoints

### `GET /api/rules`

Returns all rules for the authenticated user, ordered by `sequence` ascending.

Response:
```json
[
  {
    "id": "...",
    "sequence": 1,
    "match": "costco",
    "categoryId": "...",
    "category": { "id": "...", "name": "Groceries" }
  }
]
```

### `POST /api/rules`

Create a new rule. Auto-assigns the next sequence number (max existing + 1).

Body:
```json
{ "match": "costco", "categoryId": "..." }
```

Validations:
- `match` is required and non-empty
- `categoryId` must belong to the user
- Duplicate `match` strings should be warned but allowed (user may want different priority)

### `PUT /api/rules/[id]`

Update a rule's match string or target category.

Body:
```json
{ "match": "costco wholesale", "categoryId": "..." }
```

### `DELETE /api/rules/[id]`

Delete a rule. Verify ownership.

### `PUT /api/rules/reorder`

Batch-update sequence numbers for all rules.

Body:
```json
{ "ruleIds": ["id1", "id2", "id3"] }
```

The array order becomes the new sequence (index 0 = sequence 0, index 1 = sequence 1, etc.).

## Rule Matching Logic

### Core function: `applyRules`

Create a shared utility function in `app/lib/rules.ts`:

```ts
import { prisma } from "@/app/lib/db";

interface Rule {
  match: string;
  categoryId: string;
}

/**
 * Given a transaction description, find the first matching rule
 * and return the categoryId, or null if no rule matches.
 */
export async function matchRule(
  userId: string,
  description: string
): Promise<string | null> {
  const rules = await prisma.categoryRule.findMany({
    where: { userId },
    orderBy: { sequence: "asc" },
    select: { match: true, categoryId: true },
  });

  const lowerDesc = description.toLowerCase();
  for (const rule of rules) {
    if (lowerDesc.includes(rule.match.toLowerCase())) {
      return rule.categoryId;
    }
  }
  return null;
}
```

### Performance note

Rules are fetched per-user and are typically a small set (<100). For batch operations (CSV import, backfill), fetch rules once and pass them in to avoid repeated DB queries:

```ts
export async function matchRuleFromList(
  rules: Rule[],
  description: string
): Promise<string | null> {
  const lowerDesc = description.toLowerCase();
  for (const rule of rules) {
    if (lowerDesc.includes(rule.match.toLowerCase())) {
      return rule.categoryId;
    }
  }
  return null;
}
```

## Integration Points

There are 4 places where transactions are created. Each needs rule matching added:

### 1. Manual transaction creation (`POST /api/transaction`)

**File:** `app/api/transaction/route.ts`

**Logic:** If `categoryId` is already provided and valid, skip rule matching. Otherwise, call `matchRule(userId, description)` and use the result.

```ts
let resolvedCategoryId = categoryId || null;
if (!resolvedCategoryId) {
  resolvedCategoryId = await matchRule(session.user.id, description);
}
```

### 2. CSV import (`POST /api/transaction/import`)

**File:** `app/api/transaction/import/route.ts`

**Logic:** If the CSV row has a category column and a valid category was resolved, skip rule matching. Otherwise, apply rules. Fetch rules once before the loop for performance.

```ts
// Before the loop:
const rules = await prisma.categoryRule.findMany({
  where: { userId: session.user.id },
  orderBy: { sequence: "asc" },
  select: { match: true, categoryId: true },
});

// Inside the loop, after resolving category from CSV column:
if (!categoryId) {
  categoryId = matchRuleFromList(rules, description);
}
```

### 3. Sophtron connect/save (`POST /api/sophtron/connect/save`)

**File:** `app/api/sophtron/connect/save/route.ts`

**Logic:** Sophtron-synced transactions never come with categories. Always apply rules for new transactions (not for updates of existing ones that may already have user-assigned categories).

```ts
// Before the member loop:
const rules = await prisma.categoryRule.findMany({
  where: { userId },
  orderBy: { sequence: "asc" },
  select: { match: true, categoryId: true },
});

// In the transaction create block:
const ruleCategory = matchRuleFromList(rules, txn.Description || "");
await prisma.transaction.create({
  data: {
    ...
    categoryId: ruleCategory,
  },
});
```

For existing transaction updates, preserve the current category (don't overwrite user's manual categorization).

### 4. Backfill (`POST /api/backfill`)

**File:** `app/api/backfill/route.ts`

Same pattern as Sophtron connect/save. Fetch rules once, apply to new transactions only.

## Frontend

### New page: `/rule`

**File:** `app/(dashboard)/rule/page.tsx`

Layout similar to the Category or Budget page:
- Page title "Rules" with a form to create new rules at the top
- List of existing rules below, ordered by sequence
- Each rule shows: sequence number, match string, target category name, edit/delete buttons

### Rule list component: `RuleList.tsx`

**File:** `app/components/rule/RuleList.tsx`

- Displays rules in sequence order
- Each row: drag handle (or up/down arrows), match string, category badge, edit/delete icons
- Drag-and-drop reordering (or simpler: up/down arrow buttons) that calls `PUT /api/rules/reorder`

### Rule form component: `CreateRuleForm.tsx`

**File:** `app/components/rule/CreateRuleForm.tsx`

- Input field for match string
- Category dropdown (same flat "Parent > Child" format used elsewhere)
- "Add Rule" button

### Rule editor component: `RuleEditor.tsx`

**File:** `app/components/rule/RuleEditor.tsx`

- Inline editing of match string and category (similar to BucketEditor)
- Save/Cancel buttons

### Navigation

Add "Rule" to the Topbar nav items (between "Transaction" and the right side).

### Translations

Add `rule` section to `en.json` and `zh.json`:

```json
"rule": {
  "title": "Rules",
  "addRule": "Add Rule",
  "editRule": "Edit Rule",
  "deleteRule": "Delete Rule",
  "matchString": "Match String",
  "targetCategory": "Target Category",
  "deleteWarning": "Are you sure you want to delete this rule?",
  "noRules": "No rules yet",
  "noRulesDesc": "Create rules to automatically categorize transactions based on their description.",
  "matchPlaceholder": "e.g. costco, amazon, netflix",
  "duplicateMatch": "A rule with this match string already exists"
}
```

## Implementation Order

1. **Schema** — add `CategoryRule` model, run migration
2. **Utility** — create `app/lib/rules.ts` with `matchRule` and `matchRuleFromList`
3. **API** — create CRUD endpoints (`/api/rules`, `/api/rules/[id]`, `/api/rules/reorder`)
4. **Integration** — add rule matching to the 4 transaction creation paths
5. **Frontend** — create Rule page, components, navigation link
6. **Translations** — add rule-related keys to all locale files
7. **Testing** — verify rules work for manual, CSV, and Sophtron transactions

## Edge Cases

- **Deleted category**: `onDelete: Cascade` on the FK means deleting a category deletes its rules too. This is correct — a rule pointing to a non-existent category is useless.
- **Empty match string**: reject at the API level.
- **Very long descriptions**: `includes()` on a 500-char description against a short match string is fine performance-wise.
- **Case sensitivity**: matching is always case-insensitive (both sides lowercased).
- **Multiple rules match**: only the first match (lowest sequence) wins. No ambiguity.
- **User renames a category**: rules still point to the same `categoryId`, so they continue to work. Only the display name changes.
- **CSV import with category column**: if the CSV provides a valid category, it takes precedence over rules. If the CSV category can't be resolved (name not found), rules are used as fallback.
