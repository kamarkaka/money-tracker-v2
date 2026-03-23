# In-Page Guide System

## Overview

Build a reusable spotlight/tooltip tour system that activates on the user's first visit to each page. It highlights UI elements one at a time with a tooltip explaining the feature, and guides the user through the main workflow.

---

## 1. Core Components

### `PageGuide` — Main orchestrator
- Accepts a list of guide steps (target element selector, tooltip text, position)
- Renders a semi-transparent overlay with a "spotlight" cutout around the target element
- Shows a tooltip with text, step counter, and Next/Skip buttons
- Tracks completion via API (per-page)

### `SpotlightOverlay` — Visual layer
- Full-screen overlay (z-60) with dark backdrop
- Rectangular cutout around the highlighted element (using CSS clip-path or SVG mask)
- Smooth transition when moving between steps
- The highlighted element remains interactive (clickable through the cutout)

### `GuideTooltip` — Info bubble
- Positioned relative to the highlighted element (above/below/left/right, auto-calculated)
- Contains: title, description, step indicator (e.g., "2 of 5"), Next button, Skip link
- Arrow pointing to the target element
- Mobile-responsive (always visible in viewport)

---

## 2. Database

### Add visited pages tracking to UserSetting
```
visitedPages String[] @default([])
```

Or simpler — a new table:

```prisma
model PageGuideCompletion {
  id     String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId String @map("user_id") @db.Uuid
  page   String @db.VarChar(50)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, page])
  @@map("page_guide_completion")
}
```

### API
- `GET /api/guide?page=overview` — returns `{ completed: boolean }`
- `PUT /api/guide` — body `{ page: "overview" }` marks page guide as completed

---

## 3. Guide Steps Per Page

### Casual Mode — Overview Page
1. **Summary Cards** — "Here's your monthly snapshot. See your income, expenses, and net savings at a glance."
2. **Month Picker** — "Tap the month to see your financial data for that period."
3. **Add Button (+)** — "Tap the + button to quickly add a new expense or income."
4. **Emoji Grid** — "Each circle represents a spending category. The ring shows how much of your total it makes up."
5. **Tap to Expand** — "Tap any emoji to see the individual transactions in that category."

### Casual Mode — Add Transaction Modal (triggered on first open)
1. **Date** — "Today's date is auto-filled. Tap the calendar to change it."
2. **Emoji Picker** — "Pick an emoji to categorize your transaction. Your recent picks appear here for quick access."
3. **Amount** — "Type the amount. The decimal is handled automatically."
4. **Note** — "Add an optional note to remember what this was for."

### Pro Mode — Overview Page
1. **Summary Cards** — "Your monthly financial overview — income, expenses, and net savings."
2. **Month Picker** — "Navigate between months to see historical data."
3. **Budget Cards** — "Each card shows a budget category with spending progress. Tap to see transactions."

### Pro Mode — Account Page
1. **Summary Cards** — "Your total assets, liabilities, and net worth."
2. **Institution Cards** — "Each card represents a linked bank or manual account."
3. **Add Buttons** — "Link a bank account or add one manually."
4. **Hide/Unhide** — "Toggle the eye icon to hide accounts from your overview."

### Pro Mode — Transaction Page
1. **Search Bar** — "Search transactions by description."
2. **Filter Chips** — "Filter by account, category, date, or amount. Tap a chip to open its filter."
3. **Transaction List** — "Tap any transaction to edit it. New transactions load as you scroll."
4. **Add Button (+)** — "Add transactions manually, import CSV, or download your data."

### Pro Mode — Category Page
1. **Create Accordion** — "Tap to create a new category. Categories help organize your transactions."
2. **Category Cards** — "Each card is a parent category. Sub-categories appear as pills inside."
3. **Delete** — "Tap the trash icon to delete a category. Sub-categories have an × to remove them."

### Pro Mode — Budget Page
1. **Create Accordion** — "Create a budget by picking an icon, naming it, and assigning categories."
2. **Budget Cards** — "See your budgets with their monthly limits. The icon and color help identify them."
3. **Edit/Delete** — "Tap a card to reveal edit and delete options."

### Pro Mode — Rule Page
1. **Create Accordion** — "Rules automatically categorize transactions based on their description."
2. **Rule Cards** — "Each rule matches a text pattern to a category. The arrow shows the mapping."
3. **Edit/Delete** — "Tap a card for edit and delete options."

### Pro Mode — Tag Page
1. **Create Accordion** — "Tags are flexible labels you can attach to any transaction."
2. **Tag Cards** — "Tap a tag to see all transactions with that label."
3. **Edit/Delete** — "Edit the tag name or delete it."

### Profile Page
1. **User Info** — "Update your name and email here."
2. **Tutorial Button** — "Tap the book icon to replay the app tutorial."
3. **Change Password** — "Update your password if you signed up with email."

### Setting Page
1. **Theme** — "Choose light, dark, or system theme."
2. **Language** — "Switch between English and Chinese."

---

## 4. Implementation Details

### Step Definition
```typescript
interface GuideStep {
  target: string;        // CSS selector for the element to highlight
  title: string;         // i18n key for the title
  description: string;   // i18n key for the description
  position: "top" | "bottom" | "left" | "right" | "auto";
  action?: "click" | "hover"; // optional: wait for user to perform an action
}
```

### Spotlight Cutout Technique
Use a full-screen SVG with a rectangular mask:
```html
<svg class="fixed inset-0 z-[55]">
  <defs>
    <mask id="spotlight">
      <rect width="100%" height="100%" fill="white"/>
      <rect x={targetRect.x - padding} y={targetRect.y - padding}
            width={targetRect.width + padding*2}
            height={targetRect.height + padding*2}
            rx="8" fill="black"/>
    </mask>
  </defs>
  <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#spotlight)"/>
</svg>
```

### Tooltip Positioning
- Calculate position based on target element's `getBoundingClientRect()`
- Prefer `bottom` by default
- If not enough space below, flip to `top`
- On mobile, always position below with full-width tooltip
- Add a small arrow/caret pointing to the target

### Auto-scroll
- If the target element is not in viewport, scroll it into view with `scrollIntoView({ behavior: "smooth", block: "center" })`
- Wait for scroll to complete before showing the spotlight

### Resize/Scroll Handling
- Recalculate spotlight position on window resize and scroll
- Use `ResizeObserver` on the target element for dynamic content

---

## 5. UX Flow

```
User visits page for the first time
  → Check GET /api/guide?page=xxx
  → If not completed:
    → Show guide after page content loads (500ms delay)
    → Step through highlights with Next button
    → "Skip" link available at each step
    → On completion or skip: PUT /api/guide { page: xxx }
    → Guide never shows again for this page
```

### Re-triggering
- Add a "Replay Guide" option in the page's header or settings
- Calling the API to delete the completion record allows re-triggering

---

## 6. Files to Create

| File | Purpose |
|------|---------|
| `app/components/guide/PageGuide.tsx` | Main orchestrator component |
| `app/components/guide/SpotlightOverlay.tsx` | SVG mask overlay |
| `app/components/guide/GuideTooltip.tsx` | Tooltip with text and navigation |
| `app/components/guide/usePageGuide.ts` | Hook to check/complete guide status |
| `app/components/guide/guide-steps.ts` | Step definitions per page |
| `app/api/guide/route.ts` | GET/PUT for guide completion |
| `prisma/migrations/xxx/migration.sql` | PageGuideCompletion table |

### Files to Modify
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `PageGuideCompletion` model |
| Each page component | Add `<PageGuide page="xxx" />` |
| `app/messages/en.json` | Guide text for all steps |
| `app/messages/zh.json` | Chinese translations |

---

## 7. Implementation Order

1. **Database** — Schema + migration for PageGuideCompletion
2. **API** — GET/PUT endpoints for guide status
3. **Core Components** — PageGuide, SpotlightOverlay, GuideTooltip
4. **Hook** — usePageGuide for status checking
5. **Casual Overview Guide** — First page to implement (4 steps)
6. **Add Transaction Guide** — Modal guide (4 steps)
7. **Pro Overview Guide** — 3 steps
8. **Other Pro Pages** — Account, Transaction, Category, Budget, Rule, Tag
9. **Profile & Setting** — Simple 2-3 step guides
10. **i18n** — All guide text in en.json and zh.json
11. **Replay** — Option to re-trigger guides

---

## 8. Design Notes

- **Overlay color**: `rgba(0, 0, 0, 0.5)` — dark enough to focus attention but not jarring
- **Spotlight padding**: 8px around the target element
- **Tooltip max-width**: 280px on mobile, 320px on desktop
- **Animation**: Spotlight cutout transitions smoothly between steps (300ms ease)
- **Step indicator**: Small dots or "2 of 5" text
- **Skip**: Always available, muted text style
- **Completion**: Small celebration (confetti or checkmark) on last step optional
- **Z-index**: Overlay at z-[55], tooltip at z-[56], above modals but below FAB close
