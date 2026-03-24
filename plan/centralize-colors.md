# Centralize Hardcoded Colors

## Current State

`lib/theme.ts` defines light/dark theme colors (background, card, text, accent, income, expense, etc.) but many colors are hardcoded throughout the codebase. There are **90+ hardcoded hex values** across 15 files.

## Categories of Hardcoded Colors

### 1. Brand / UI Colors (used in multiple files)
These should be added to `lib/theme.ts`:

| Color | Usage | Proposed Theme Key |
|-------|-------|-------------------|
| `#10b981` | FAB, month pill selected, save button, calendar icon, unlock button | `brand` |
| `#ffffff` | FAB icon, save button text, unlock button text, month pill selected text | `white` (or use `accentText`) |
| `#000` / `rgba(0,0,0,...)` | Shadow colors, backdrop overlay | `shadow`, `backdrop` |

### 2. Semantic Colors — Income/Expense Variants (light/dark pairs)
Currently scattered with `isDark ? X : Y` ternaries. Should be in theme:

| Light | Dark | Usage | Proposed Theme Key |
|-------|------|-------|-------------------|
| `#059669` | `#34d399` | Income text, savings positive, income accent | `income` (already exists but not used consistently) |
| `#dc2626` | `#f87171` | Expense text, savings negative, expense accent | `expense` (already exists but not used consistently) |
| `#16a34a` | `#6ee7b7` | Income toggle text, amount color | (merge into `income`) |
| `#fee2e2` | `#4c1d1d` | Expense toggle background | `expenseBg` |
| `#dcfce7` | `#064e3b` | Income toggle background | `incomeBg` |
| `#ecfdf5` | `#064e3b` | Header gradient start, success banner bg | `successBg` |
| `#fef2f2` | N/A | Delete button background | `dangerBg` |
| `#ef4444` | N/A | Delete icon, danger text | `danger` |
| `#047857` | N/A | Success banner text | `successText` |

### 3. Category Ring Colors (overview.tsx)
Array of 10 colors for category progress rings. These are decorative, not semantic — keep as a constant array but move to `lib/theme.ts` or a dedicated `lib/colors.ts`.

### 4. Category Icon Colors (emoji.ts)
20 colors for category icons. These are data-level colors tied to category identity — keep in `emoji.ts` as they are (they don't change with dark mode).

### 5. Menu Item Icon Colors (more.tsx, settings.tsx, placeholder pages)
Colors like `#3b82f6` (accounts), `#8b5cf6` (categories), `#f97316` (rules), etc. These are decorative per-feature brand colors. Move to a `MENU_COLORS` constant in theme or a shared location since they're repeated between `more.tsx` and the placeholder pages.

### 6. Gradient Colors (overview.tsx)
`["#064e3b", theme.background]` / `["#ecfdf5", theme.background]` — derived from theme. Should use theme keys.

### 7. Scroll Bar (overview.tsx)
`rgba(255,255,255,0.5)` — should adapt to dark/light mode.

## Proposed Changes

### Step 1: Expand `lib/theme.ts`

Add new color keys to both light and dark themes:

```typescript
export const colors = {
  light: {
    // existing...
    brand: "#10b981",
    brandText: "#ffffff",
    income: "#16a34a",      // already exists, keep
    expense: "#dc2626",     // already exists, keep
    incomeBg: "#dcfce7",
    expenseBg: "#fee2e2",
    successBg: "#ecfdf5",
    successText: "#047857",
    danger: "#ef4444",
    dangerBg: "#fef2f2",
    gradientStart: "#ecfdf5",
    shadow: "#000000",
    backdrop: "rgba(0,0,0,0.4)",
    scrollIndicator: "rgba(0,0,0,0.2)",
  },
  dark: {
    // existing...
    brand: "#10b981",
    brandText: "#ffffff",
    income: "#34d399",      // update from #22c55e
    expense: "#f87171",     // update from #ef4444
    incomeBg: "#064e3b",
    expenseBg: "#4c1d1d",
    successBg: "#064e3b",
    successText: "#6ee7b7",
    danger: "#ef4444",
    dangerBg: "#4c1d1d",
    gradientStart: "#064e3b",
    shadow: "#000000",
    backdrop: "rgba(0,0,0,0.4)",
    scrollIndicator: "rgba(255,255,255,0.5)",
  },
};
```

### Step 2: Create `lib/colors.ts` for Non-Theme Constants

```typescript
// Category ring colors for overview chart
export const RING_COLORS = [
  "#0ea5e9", "#8b5cf6", "#06b6d4", "#f59e0b",
  "#0891b2", "#6366f1", "#0d9488", "#ec4899",
  "#0284c7", "#0e7490",
];

// Menu item feature colors
export const MENU_COLORS = {
  settings: "#71717a",
  accounts: "#3b82f6",
  transactions: "#f59e0b",
  categories: "#8b5cf6",
  budgets: "#10b981",
  rules: "#f97316",
  tags: "#14b8a6",
  export: "#0ea5e9",
  import: "#8b5cf6",
};
```

### Step 3: Update Files

| File | Changes |
|------|---------|
| `app/(tabs)/overview.tsx` | Replace all `isDark ? X : Y` color ternaries with `theme.income`, `theme.expense`, `theme.gradientStart`, `theme.brand`, `theme.scrollIndicator`. Move `RING_COLORS` to `lib/colors.ts`. |
| `app/(tabs)/_layout.tsx` | Replace `#10b981` → `theme.brand`, `#ffffff` → `theme.brandText`, `#000` → `theme.shadow` |
| `app/(tabs)/more.tsx` | Import `MENU_COLORS` from `lib/colors.ts`, replace `#10b981` → `theme.brand` |
| `components/TransactionModal.tsx` | Replace toggle bg colors with `theme.incomeBg`/`theme.expenseBg`, amount color with `theme.income`/`theme.expense`, `#10b981` → `theme.brand`, `#ef4444` → `theme.danger`, `#fef2f2` → `theme.dangerBg`, `rgba(0,0,0,0.4)` → `theme.backdrop`, `#000` → `theme.shadow` |
| `app/pages/profile.tsx` | Replace `#ecfdf5` → `theme.successBg`, `#047857` → `theme.successText` |
| `app/pages/settings.tsx` | Import `MENU_COLORS` for export/import icon colors |
| `app/pages/*.tsx` (placeholders) | Import `MENU_COLORS` for icon colors |
| `app/modal/transaction-detail.tsx` | Replace `#ef4444` → `theme.danger` |
| `app/(auth)/login.tsx` | Replace `#ef4444` → `theme.danger` (beta badge) |

### Files NOT Changed
- `lib/emoji.ts` — Category icon colors are data-level, not theme-dependent. Keep as-is.
- `packages/shared/src/constants/index.ts` — `TAG_COLORS` and `ACCOUNT_COLORS` are shared across web/mobile. Keep as-is.

## Impact
- ~90 hardcoded colors reduced to ~10 (emoji.ts data colors + shared constants)
- All dark mode color decisions centralized in `theme.ts`
- No more `isDark ? X : Y` scattered across components
- Adding a new theme (e.g., OLED black) becomes trivial
