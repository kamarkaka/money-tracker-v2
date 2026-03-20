# Responsive Design — Implementation Plan

## Overview

Make the app fully usable on mobile devices (320px–768px) while preserving the current desktop experience. The approach: mobile-first breakpoint overrides using Tailwind's `md:` (768px) and `lg:` (1024px) prefixes.

## Priority Order

Changes are ordered by impact — fixing the global blockers first, then page-by-page.

---

## Phase 1: Global Blockers

### 1.1 Remove hardcoded min-width

**Files:** `AppShell.tsx`, `Topbar.tsx`

Both have `min-w-[960px]` which forces horizontal scrolling on any screen under 960px. This is the single biggest blocker.

```diff
// AppShell.tsx
- <main className="mx-auto min-w-[960px] max-w-7xl px-6 py-8">
+ <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">

// Topbar.tsx
- <div className="mx-auto flex h-16 min-w-[960px] max-w-7xl items-center justify-between px-6">
+ <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:h-16 md:px-6">
```

### 1.2 Mobile navigation (hamburger menu)

**File:** `Topbar.tsx`

Replace the horizontal nav links with a hamburger menu on mobile:

- **Desktop (md+):** keep current horizontal nav links
- **Mobile (<md):** hide nav links, show a hamburger icon (Bars3Icon) that opens a slide-down or slide-in menu with all nav items + the dropdown menu items

Implementation:
- Add a `mobileMenuOpen` state
- Render a hamburger button visible only on `md:hidden`
- Render the nav links with `hidden md:flex`
- When hamburger is tapped, show a full-width dropdown below the topbar with all links stacked vertically
- The avatar/theme/language buttons stay in the top bar (they're small enough)

### 1.3 Modal mobile treatment

**File:** `Modal.tsx`

Make modals full-screen on mobile:

```diff
- className={cn(
-   "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg ...",
-   className
- )}
+ className={cn(
+   "fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
+   "rounded-none md:rounded-lg overflow-y-auto max-h-screen md:max-h-[90vh]",
+   className
+ )}
```

On mobile: full-screen, no rounded corners, scrollable content.
On desktop: centered, rounded, max 90vh.

---

## Phase 2: Page-by-Page Fixes

### 2.1 Transaction Page

**Header buttons:** stack vertically on mobile.
```diff
- <div className="mb-6 flex items-center justify-between">
+ <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
```
The 3 action buttons (Download, Import, Add) should wrap:
```diff
- <div className="flex gap-3">
+ <div className="flex flex-wrap gap-2 md:gap-3">
```

**DataTable:** already has `overflow-x-auto`. On mobile, consider hiding less-important columns (account, category) or reducing their widths. The checkbox and edit columns should remain.

**Bulk action bar:** stack on mobile.
```diff
- <div className="sticky top-16 ... flex items-center gap-3 ...">
+ <div className="sticky top-14 md:top-16 ... flex flex-col gap-2 md:flex-row md:items-center md:gap-3 ...">
```

**Pagination:** reduce padding, use shorter labels.

### 2.2 Account Page

**Header:** stack title/net worth and buttons vertically.
```diff
- <div className="mb-6 flex items-center justify-between">
+ <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
```
Buttons should wrap:
```diff
- <div className="flex gap-3">
+ <div className="flex flex-wrap gap-2 md:gap-3">
```

### 2.3 Profile Page

**Two-column layout:** stack cards on mobile.
```diff
- <div className="flex flex-row gap-6">
+ <div className="flex flex-col gap-6 md:flex-row">
```

### 2.4 Overview Page

**MonthlySummaryHeader:** 3-column grid → stack on mobile.
```diff
- <div className="grid grid-cols-3 gap-4">
+ <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
```

**BucketTransactionList:** hide account column on mobile, reduce widths.
```diff
// Date column
- <span className="w-20 shrink-0 ...">
+ <span className="w-16 shrink-0 md:w-20 ...">

// Account column — hide on mobile
- <span className="w-28 shrink-0 ...">
+ <span className="hidden md:inline w-28 shrink-0 ...">

// Category editor — hide or collapse on mobile
- <div className="w-40 shrink-0">
+ <div className="hidden md:block w-40 shrink-0">

// Amount — reduce width
- <span className="w-24 shrink-0 text-right">
+ <span className="w-20 shrink-0 text-right md:w-24">
```

### 2.5 Category Page — CreateCategoryForm

Stack form fields vertically on mobile:
```diff
- <form onSubmit={handleSubmit} className="flex items-end gap-3">
+ <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row md:items-end">
```

### 2.6 Rule Page — CreateRuleForm & RuleList

**CreateRuleForm:** stack vertically, remove fixed `w-64` on mobile:
```diff
- <FormField label={i18n("targetCategory")} className="w-64">
+ <FormField label={i18n("targetCategory")} className="w-full md:w-64">
```

**RuleList:** on mobile, switch to card layout instead of table-like rows. Each rule becomes a stacked card:
```
[#1] [drag handle]
Match: "costco"
Category: Groceries
[Edit] [Delete]
```

The edit mode should also stack vertically.

**Drag-and-drop:** add touch event support (`onTouchStart`, `onTouchMove`, `onTouchEnd`) alongside the existing drag events, or fall back to up/down buttons on mobile.

### 2.7 Tag Page — TagCard

Transaction rows inside TagCard: same treatment as BucketTransactionList — hide account column, reduce widths.

---

## Phase 3: Touch Interactions

### 3.1 Drag-and-drop for rules

The HTML5 Drag and Drop API doesn't work on touch devices. Options:
- **Option A:** Detect touch devices and show up/down buttons as fallback
- **Option B:** Use touch events (`onTouchStart/Move/End`) to implement custom drag
- **Option C:** Use a library like `@dnd-kit/core` that supports both mouse and touch

**Recommendation:** Option A (simplest). Show up/down arrow buttons on mobile (`md:hidden`), keep drag handles on desktop (`hidden md:block`).

### 3.2 Hover-dependent UI

Several elements only appear on hover (e.g., Hide/Unhide/Delete buttons on transactions, edit/delete on categories). On touch devices, hover doesn't exist.

**Fix:** make these elements always visible on mobile, or show them on tap:
```diff
- className="opacity-0 group-hover:opacity-100"
+ className="opacity-100 md:opacity-0 md:group-hover:opacity-100"
```

### 3.3 Click-outside to close

Dropdowns use `mousedown` for click-outside detection. This works on mobile (touch events trigger mousedown), so no change needed.

---

## Phase 4: Topbar Responsive Sticky Behavior

### 4.1 Sticky top offset

The bulk action bar in the transaction page uses `sticky top-16` (matching the 64px topbar height). On mobile with the shorter topbar (`h-14` = 56px), update to:
```diff
- <div className="sticky top-16 ...">
+ <div className="sticky top-14 md:top-16 ...">
```

---

## Implementation Order

1. **AppShell + Topbar:** remove min-width, add hamburger menu (unblocks everything)
2. **Modal:** full-screen on mobile
3. **Transaction page:** header, bulk bar, pagination
4. **Account page:** header buttons
5. **Profile page:** two-column → stack
6. **Overview page:** summary header, transaction lists
7. **Forms:** CreateCategoryForm, CreateRuleForm, CreateTagForm
8. **RuleList:** card layout + touch drag fallback
9. **Hover-dependent elements:** always-visible on mobile
10. **Testing:** verify on 320px, 375px, 414px, 768px viewports

## Breakpoint Strategy

| Breakpoint | Width | Behavior |
|---|---|---|
| Default | <768px | Mobile: stacked layouts, hamburger nav, full-screen modals |
| `md:` | ≥768px | Tablet: side-by-side layouts, horizontal nav starts |
| `lg:` | ≥1024px | Desktop: full experience, max-width container |

## Files to Modify

| Priority | File | Changes |
|---|---|---|
| **P0** | `AppShell.tsx` | Remove `min-w-[960px]`, reduce mobile padding |
| **P0** | `Topbar.tsx` | Remove `min-w-[960px]`, add hamburger menu, responsive height |
| **P0** | `Modal.tsx` | Full-screen on mobile, scrollable content |
| **P1** | `transaction/page.tsx` | Stack header, wrap buttons, responsive sticky offset |
| **P1** | `account/page.tsx` | Stack header, wrap buttons |
| **P1** | `profile/page.tsx` | Stack two-column layout |
| **P1** | `MonthlySummaryHeader.tsx` | Responsive grid |
| **P2** | `BucketTransactionList.tsx` | Hide columns on mobile |
| **P2** | `CreateCategoryForm.tsx` | Stack form fields |
| **P2** | `CreateRuleForm.tsx` | Stack form fields, responsive select width |
| **P2** | `RuleList.tsx` | Card layout on mobile, touch drag fallback |
| **P2** | `TagCard.tsx` | Hide columns in transaction rows |
| **P3** | Various | Fix hover-only elements for touch |
