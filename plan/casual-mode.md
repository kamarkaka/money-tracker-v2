# Casual Mode Implementation Plan

## Overview

Add a dual-mode system: **Pro** (existing full-featured app) and **Casual** (simplified expense tracker). Users choose their mode after registration, before the tutorial. Casual users get a streamlined experience focused on quick daily expense logging.

---

## 1. Database Changes

### User Setting
- Add `mode` field to `UserSetting` model: `VARCHAR(10)`, default `"pro"`
- Valid values: `"pro"`, `"casual"`

```prisma
model UserSetting {
  ...
  mode String @default("pro") @db.VarChar(10)
}
```

### Migration
- `ALTER TABLE user_setting ADD COLUMN mode VARCHAR(10) DEFAULT 'pro';`

### Casual Mode Seed Data
- On mode selection (casual), auto-create:
  - A dummy Institution named "My Wallet" (isManual: true)
  - A dummy Account named "Daily Expenses" under that institution (type: "checking")
- Store the account ID in user setting or just query by convention

---

## 2. Category Emoji System (Casual Mode)

Instead of the full category tree, casual mode uses emoji-based categories. These are pre-seeded when user selects casual mode.

### Pre-seeded Emoji Categories
| Emoji | Name |
|-------|------|
| 🍔 | Food & Dining |
| 🛒 | Groceries |
| 🚗 | Transportation |
| 🏠 | Housing |
| 💊 | Health |
| 🎮 | Entertainment |
| 👕 | Shopping |
| 📱 | Subscriptions |
| ✈️ | Travel |
| 🎓 | Education |
| 💰 | Income |
| 📦 | Others |

### Database
- Add `emoji` field to `Category` model: `VARCHAR(10)`, nullable
- In casual mode, categories are created with both `name` and `emoji`
- The emoji is the primary visual identifier in casual mode

```prisma
model Category {
  ...
  emoji String? @db.VarChar(10)
}
```

---

## 3. Mode Selection Screen

### When
- After user registration, before tutorial
- New screen inserted between registration success and tutorial start

### UI Design
- Two large cards side by side (stacked on mobile):
  - **Casual Mode** card:
    - 🎯 icon
    - "Quick & Simple"
    - "Track daily expenses with emojis. Perfect for personal spending."
    - Bullet points: No bank linking needed, Emoji categories, One-tap logging
  - **Pro Mode** card:
    - 📊 icon
    - "Full Control"
    - "Link bank accounts, set budgets, create rules. For serious tracking."
    - Bullet points: Bank sync, Budgets & rules, Tags & categories
- Selecting casual skips the full tutorial, shows a brief casual onboarding instead
- Selecting pro proceeds to the existing tutorial

### Implementation
- New component: `ModeSelectionStep` in tutorial steps
- Triggered after registration, before `TutorialOverlay`
- On casual selection:
  1. Save mode to user setting via API
  2. Create dummy institution + account
  3. Create emoji categories
  4. Skip tutorial, go to casual overview
- On pro selection:
  1. Save mode to user setting via API
  2. Proceed to existing tutorial

---

## 4. API Changes

### `GET /api/setting` & `PUT /api/setting`
- Include `mode` field in response/request
- Validate: only allow `"casual"` → `"pro"` switch, not reverse

### `POST /api/setting/switch-to-pro`
- Dedicated endpoint for mode switch
- Does NOT delete casual data — keeps existing transactions
- Simply updates mode to "pro"
- Response includes confirmation

### `POST /api/casual/setup`
- Creates dummy institution, account, and emoji categories
- Called once when user selects casual mode
- Idempotent — checks if already set up

### `POST /api/transaction` (casual mode)
- Accept simplified payload: `{ emoji, amount, description?, date? }`
- Auto-resolve category from emoji
- Auto-assign to the dummy account
- Date defaults to today if not provided

---

## 5. Casual Overview Page

### Layout
- **Top**: Month selector (same MonthPicker component)
- **Summary card**: Total spent this month (single number, accent card)
- **Category breakdown**: Grid of emoji cards, each showing:
  - Large emoji
  - Category name
  - Total amount spent
  - Tap to expand and see transactions

### Design
- Clean, minimal, card-based
- Each emoji category card has a subtle gradient background
- Tapping a card shows the list of transactions in that category
- No budget progress bars, no income tracking

---

## 6. Casual Transaction Page

### Add Transaction (simplified)
- Floating "+" button → opens a quick-add form:
  - Row 1: Grid of emoji buttons (tap to select category)
  - Row 2: Amount input (CurrencyInput, numpad)
  - Row 3: Description (optional, placeholder "What was this for?")
  - Row 4: Date (pre-filled today, tappable to change)
  - Submit button
- After adding, form stays open for rapid entry (clear amount, keep category)

### Transaction List
- Grouped by date
- Each row: emoji + description + amount
- Tap to edit (same quick form, pre-filled)
- Swipe or tap to delete

---

## 7. Navigation Changes (Casual Mode)

### Topbar (Desktop)
- Nav links: Overview, Transactions only
- Avatar dropdown: Profile, Setting, Theme, Language, Logout
- No Category, Budget, Rule, Tag links

### Mobile Menu
- Show only: Overview, Transactions, Profile, Setting
- Plus theme/language toggles and logout
- Hide: Category, Budget, Rule, Tag, Account

### Setting Page
- Add "Switch to Pro Mode" button (with confirmation dialog)
- Explain what pro mode adds
- One-way switch (casual → pro)

---

## 8. AppShell / Layout Changes

### Mode Context
- Create `ModeProvider` context (or extend existing LocaleProvider/ThemeProvider)
- Fetch mode from `/api/setting` on app load
- Expose `mode` and `switchToPro()` globally
- Components check mode to render appropriate UI

### Route Protection
- Casual users accessing `/budget`, `/category`, `/rule`, `/tag`, `/account` → redirect to `/overview`
- Implement in middleware or layout component

---

## 9. Files to Create/Modify

### New Files
- `app/components/tutorial/steps/ModeSelectionStep.tsx`
- `app/components/casual/CasualOverview.tsx`
- `app/components/casual/CasualTransactionForm.tsx`
- `app/components/casual/EmojiCategoryGrid.tsx`
- `app/components/casual/CasualTransactionList.tsx`
- `app/api/casual/setup/route.ts`
- `app/api/setting/switch-to-pro/route.ts`
- `app/components/ModeProvider.tsx`
- `prisma/migrations/xxx_add_casual_mode/migration.sql`

### Modified Files
- `prisma/schema.prisma` — add `mode` to UserSetting, `emoji` to Category
- `app/api/setting/route.ts` — include mode
- `app/api/transaction/route.ts` — support casual payload
- `app/components/layout/Topbar.tsx` — conditional nav based on mode
- `app/components/layout/AppShell.tsx` — wrap with ModeProvider
- `app/(dashboard)/overview/page.tsx` — render CasualOverview or existing based on mode
- `app/(dashboard)/transaction/page.tsx` — render casual or pro view based on mode
- `app/(dashboard)/setting/page.tsx` — add switch-to-pro button
- `app/components/tutorial/TutorialOverlay.tsx` — insert ModeSelectionStep
- `app/messages/en.json` & `app/messages/zh.json` — new i18n keys

---

## 10. Implementation Order

1. **Database**: Schema changes + migration (mode, emoji)
2. **API**: Setting endpoint updates, casual setup endpoint
3. **ModeProvider**: Context for mode state
4. **Mode Selection**: ModeSelectionStep in tutorial flow
5. **Casual Setup**: Auto-create institution, account, emoji categories
6. **Casual Overview**: Simplified overview page
7. **Casual Transaction**: Quick-add form + transaction list
8. **Navigation**: Conditional topbar/menu based on mode
9. **Route Protection**: Redirect casual users from pro-only pages
10. **Switch to Pro**: Setting page button + API
11. **i18n**: All new strings in en.json and zh.json
12. **Testing**: Both modes end-to-end

---

## 11. UX Flow

### New User → Casual
```
Register → Mode Selection → [Casual] → Auto-setup → Casual Overview
```

### New User → Pro
```
Register → Mode Selection → [Pro] → Tutorial → Overview
```

### Casual → Pro Switch
```
Setting Page → "Switch to Pro" → Confirm → Full app unlocked
(existing data preserved, full nav appears)
```

### Pro → Casual
```
Not supported (for now)
```
