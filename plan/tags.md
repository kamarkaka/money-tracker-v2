# Tags — Implementation Plan

## Overview

Tags are user-defined text labels with colored backgrounds that can be attached to transactions. Unlike categories (hierarchical, one-per-transaction), tags are flat and many-to-many — a transaction can have multiple tags, and a tag can be on multiple transactions.

## Data Model

### New tables

```prisma
model Tag {
  id        String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String           @map("user_id") @db.Uuid
  name      String           @db.VarChar(50)
  color     String           @db.VarChar(7)  // hex color, e.g. "#e74c3c"
  createdAt DateTime         @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime         @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  user             User              @relation(fields: [userId], references: [id])
  transactionTags  TransactionTag[]

  @@unique([userId, name])
  @@index([userId])
  @@map("tag")
}

model TransactionTag {
  id            String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  transactionId String      @map("transaction_id") @db.Uuid
  tagId         String      @map("tag_id") @db.Uuid

  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  tag           Tag         @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([transactionId, tagId])
  @@index([transactionId])
  @@index([tagId])
  @@map("transaction_tag")
}
```

Add relations:
- `User`: add `tags Tag[]`
- `Transaction`: add `transactionTags TransactionTag[]`

### Color strategy

- `color` stores a hex background color (e.g. `"#e74c3c"`)
- On creation, assign a random color from a curated palette of ~16 visually distinct colors
- Font color (white or black) is computed client-side based on luminance:
  ```ts
  function textColorForBg(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#000000" : "#ffffff";
  }
  ```

### Tag shape CSS

Style tags with a "label tag" shape — a rounded rectangle with a pointed left edge and a small circle "hole":

```css
.tag-shape {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px 2px 14px;
  border-radius: 0 4px 4px 0;
  clip-path: polygon(8px 0%, 100% 0%, 100% 100%, 8px 100%, 0% 50%);
  font-size: 12px;
  font-weight: 500;
}
```

Alternative simpler approach: use a rounded pill shape with a small triangle notch on the left via `clip-path`. This is more recognizable as a "tag" and works well at small sizes.

## API Endpoints

### `GET /api/tags`

Returns all tags for the user.

Response:
```json
[
  {
    "id": "...",
    "name": "vacation",
    "color": "#3498db",
    "transactionCount": 5,
    "totalAmount": -1234.56
  }
]
```

For each tag, include the count and total amount of attached transactions. Only include these aggregations on the tag page (can use a query param like `?includeStats=true`).

### `POST /api/tags`

Create a new tag. Auto-assigns a random color if not provided.

Body: `{ "name": "vacation", "color": "#3498db" }` (color optional)

Validations:
- Name required, non-empty, trimmed
- Name must be unique per user (case-insensitive)

### `PUT /api/tags/[id]`

Update a tag's name or color.

Body: `{ "name": "holiday", "color": "#2ecc71" }`

### `DELETE /api/tags/[id]`

Delete a tag. `TransactionTag` entries are cascade-deleted.

### `GET /api/tags/[id]/transactions`

Returns all transactions attached to a specific tag. Used on the tag page to show the transaction list under each tag.

Response: array of transactions (same shape as `/api/transaction` response).

### `PUT /api/transaction/[id]` (existing endpoint)

Extend the existing transaction update endpoint to accept `tagIds`:

```json
{ "categoryId": "...", "tagIds": ["tag1", "tag2"] }
```

When `tagIds` is provided:
1. Delete all existing `TransactionTag` rows for this transaction
2. Create new rows for each tag ID
3. Verify each tag belongs to the user

## Frontend

### Tag page: `/tag`

**File:** `app/(dashboard)/tag/page.tsx`

Layout:
- Page title "Tags"
- Create tag form at the top (name input + "Add" button)
- List of tags below, each as a card:
  - Tag name in its styled shape with background color
  - Edit (rename/recolor) and delete buttons
  - If the tag has transactions: expandable section showing transaction count, total amount, and a transaction list
  - If no transactions: no expandable section

### Components

**`app/components/tag/TagBadge.tsx`** — The styled tag shape component:
```tsx
interface TagBadgeProps {
  name: string;
  color: string;
  onRemove?: () => void;  // optional X button for inline removal
}
```
Uses the tag-shape CSS with `backgroundColor` from the tag's `color` and computed text color for readability.

**`app/components/tag/CreateTagForm.tsx`** — Name input + Add button. Color is auto-assigned.

**`app/components/tag/TagCard.tsx`** — Single tag card on the tag page:
- Tag badge with edit/delete buttons
- Expandable transaction list with total amount
- Inline edit mode for renaming

**`app/components/tag/TagSelector.tsx`** — Used in the EditTransactionModal:
- Shows currently attached tags as TagBadge components with X buttons to remove
- Dropdown/autocomplete to search and add existing tags
- Option to create a new tag inline if no match found

### Edit Transaction Modal changes

**File:** `app/components/transaction/EditTransactionModal.tsx`

Add a "Tags" section between Category and the checkboxes:
- Display currently attached tags as TagBadge components
- TagSelector component for adding/removing tags
- On save, include `tagIds` in the PUT body

The modal needs to:
1. Receive the user's tags list (fetched from parent or directly)
2. Receive the transaction's current tags
3. Send updated `tagIds` array on save

### Transaction page changes

Include tags in the transaction list display:
- Add a "Tags" column or show tags inline with the description
- Tags shown as small colored badges

### Transaction API changes

Include tags in transaction GET responses:
```ts
include: {
  ...existing includes,
  transactionTags: {
    include: { tag: { select: { id: true, name: true, color: true } } },
  },
}
```

### Navigation

Add "Tag" to the Topbar nav items.

## Translations

Add to `en.json` / `zh.json`:
```json
"tag": {
  "title": "Tags",
  "addTag": "Add Tag",
  "editTag": "Edit Tag",
  "deleteTag": "Delete Tag",
  "tagName": "Tag Name",
  "deleteWarning": "Are you sure you want to delete this tag? It will be removed from all transactions.",
  "noTags": "No tags yet",
  "noTagsDesc": "Create tags to label and organize your transactions.",
  "namePlaceholder": "e.g. vacation, reimbursable, shared",
  "transactions": "{count} transactions",
  "total": "Total: {amount}",
  "addToTransaction": "Add tags...",
  "createNew": "Create \"{name}\""
}
```

## Color Palette

Curated palette of 16 colors with good contrast:

```ts
const TAG_COLORS = [
  "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71",
  "#1abc9c", "#3498db", "#9b59b6", "#e84393",
  "#00b894", "#0984e3", "#6c5ce7", "#fd79a8",
  "#d63031", "#e17055", "#00cec9", "#636e72",
];
```

On creation, pick a random color from this list. Users can change it later via the edit UI (color picker or preset swatches).

## Implementation Order

1. **Schema** — add `Tag` and `TransactionTag` models, migration
2. **API** — CRUD for tags, extend transaction API
3. **TagBadge component** — the styled tag shape with dynamic colors
4. **Tag page** — create form, tag list with expandable transactions
5. **TagSelector component** — for the edit transaction modal
6. **Edit Transaction Modal** — integrate TagSelector
7. **Transaction page** — show tags in the transaction table
8. **Navigation + translations**

## Edge Cases

- **Deleted tag**: cascade deletes all `TransactionTag` rows. Transactions keep their other tags.
- **Duplicate tag name**: rejected by `@@unique([userId, name])` and API validation.
- **Color uniqueness**: not enforced — two tags can have the same color. This is fine.
- **Tag on hidden transaction**: still counted in tag stats. Can be filtered if needed later.
- **Max tags per transaction**: no hard limit, but UI should handle 5-10 gracefully.
- **Tag name length**: capped at 50 chars in schema.
- **Empty tag page**: shows EmptyState component with guidance text.
