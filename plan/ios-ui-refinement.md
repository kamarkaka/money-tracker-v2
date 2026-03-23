# iOS App UI Refinement Plan

## Prerequisites

- Install `@expo/vector-icons` for proper icons (includes Ionicons, MaterialIcons, etc.)
- Copy `logo.png` from `apps/web/public/logo.png` to `apps/mobile/assets/logo.png`
- Create placeholder screens for sub-pages (accounts, categories, budgets, rules, tags, profile, settings, transactions)

---

## 1. Login Screen (`app/(auth)/login.tsx`)

### Current state
- No logo image
- Plain TextInput fields without icons
- No "or" divider
- No Google sign-in option
- Uses "Sign In" / "Sign Up" wording

### Changes

**1a. Add logo image**
- Add `<Image source={require("@/assets/logo.png")}` centered above the title
- Wrap in a bouncing animation (use `Animated` scale or `react-native-reanimated`)
- Size: 80x80, borderRadius 16, shadow
- Below: title "Money Tracker 2" with a red "beta" badge

**1b. Add icons to input fields**
- Use `Ionicons` from `@expo/vector-icons`
- Email field: `mail-outline` icon (16px, gray) inside the input container, left-aligned
- Password field: `lock-closed-outline` icon (16px, gray) inside the input container, left-aligned
- Style the input containers as a row: `[icon] [TextInput]` with border, borderRadius 12, height 50, paddingHorizontal 14

**1c. Add "or" divider**
- After the "Log In" button, add a horizontal line with "or" text centered over it
- Implementation: `<View style={row}><View style={line}/><Text>or</Text><View style={line}/></View>`
- Line: flex 1, height 1, backgroundColor cardBorder
- Text: paddingHorizontal 12, color textSecondary, fontSize 12

**1d. Add Google sign-in button**
- Below the "or" divider
- Full-width button with Google "G" SVG icon + "Log in with Google" text
- Style: bordered button matching web (borderColor cardBorder, borderRadius 12, height 50)
- For now, this can show an alert "Google sign-in coming soon" or use `expo-auth-session` to implement
- Later: integrate with `expo-auth-session/providers/google` to get an ID token, then call `/api/auth/mobile/google`

**1e. Change wording**
- "Sign In" -> "Log In"
- "Sign Up" -> "Register"
- "Don't have an account? Sign Up" -> "Don't have an account? Register"

### Files to modify
- `apps/mobile/app/(auth)/login.tsx` — full rewrite of the screen

---

## 2. Register Screen (`app/(auth)/register.tsx`)

### Changes (mirror login changes)
- Add logo image (same as login)
- Add icons to input fields:
  - Name: `person-outline`
  - Email: `mail-outline`
  - Password: `lock-closed-outline`
  - Confirm password: `lock-closed-outline`
- Change title from "Create Account" to "Register"
- Change "Already have an account? Sign In" to "Already have an account? Log In"
- Change button text from "Create Account" to "Register"

### Files to modify
- `apps/mobile/app/(auth)/register.tsx` — update to match

---

## 3. Overview Page (`app/(tabs)/overview.tsx`)

### Current state
- Has "Overview" header from tab bar
- "<" ">" text buttons for month navigation
- Simple income/expenses summary card (no net savings)
- Bucket-based card list with text progress bars
- No emoji grid

### Changes

**3a. Remove the overview header**
- Set `headerShown: false` in the tab layout for the overview screen

**3b. Month picker — horizontal scroll bar**
- Replace the `< Month >` arrows with a horizontally scrollable row of month buttons
- Show 12 months ending at the current anchor month, latest first (same as web `MonthPicker`)
- Each month button: pill shape, `shortMonth` label + year suffix on first occurrence of each year
- Selected month: filled accent background, white text
- Unselected: transparent, gray text
- Swipeable: the ScrollView handles this natively
- No arrow buttons needed on mobile (swipe is natural)
- Implementation: `<ScrollView horizontal showsHorizontalScrollIndicator={false}>` with `TouchableOpacity` buttons

**3c. Summary cards — match web layout**
- 3 cards in a grid layout:
  - **Net Savings** (full width on top): blue background if positive, red if negative. Large bold amount. Label "Net Savings" above.
  - **Income** (half width, left): green background (emerald-50 / emerald-900 dark). Label "Income" + formatted amount.
  - **Expenses** (half width, right): red background (red-50 / red-900 dark). Label "Expenses" + formatted amount.
- Layout: first card full width, below that two cards side by side using `flexDirection: "row"`
- Border, borderRadius 16, padding. Colors matching web CSS variables.

**3d. Emoji grid with progress ring — match web CasualOverview**
- Replace the bucket-based card list with the emoji group grid
- Group transactions by `category.emoji` (same logic as `CasualOverview`)
- Display as a 4-column grid of tappable emoji circles
- Each emoji circle:
  - 72x72 container
  - SVG progress ring (use `react-native-svg` Circle with strokeDasharray/strokeDashoffset)
  - Emoji text centered inside (fontSize 30)
  - Below: formatted dollar amount in the group's assigned color
- On tap: expand/collapse a transaction list below that row (same as web)
- Expanded list: card with each transaction showing date, description, amount
- Color rotation: use the same `RING_COLORS` and `TEXT_COLORS` arrays from the web

### New dependencies
- `react-native-svg` — for the SVG progress rings

### Files to modify
- `apps/mobile/app/(tabs)/overview.tsx` — full rewrite
- `apps/mobile/app/(tabs)/_layout.tsx` — hide header for overview

---

## 4. Bottom Navigation Bar (`app/(tabs)/_layout.tsx`)

### Current state
- 3 tabs: Overview, Transactions, More
- Uses emoji-based icons (📊, 📋, ⚙️) which render inconsistently

### Changes

**4a. Remove Transactions tab**
- Delete `apps/mobile/app/(tabs)/transactions.tsx`
- Remove the `Tabs.Screen name="transactions"` entry from the layout

**4b. Restructure to 3 tabs: Overview, Add, More**
- Tab 1: **Overview** — icon: `Ionicons` `pie-chart-outline` / `pie-chart` (filled when active)
- Tab 2: **Add** — special green plus button (not a real tab, triggers the add-transaction modal)
- Tab 3: **More** — icon: `Ionicons` `ellipsis-horizontal` / `menu-outline`

**4c. Green "+" center button**
- Custom `tabBarButton` for the Add tab that renders a raised green circle (56x56)
- backgroundColor: `#10b981` (emerald-500), borderRadius: 28
- White "+" icon centered, shadow underneath
- On press: `router.push("/modal/add-transaction")`
- The Add tab should not have a label or active state — it's purely a button
- Create a dummy `app/(tabs)/add.tsx` that immediately redirects (or use `listeners` to intercept and prevent navigation, opening the modal instead)

**4d. Use Ionicons for all tab icons**
- Replace the emoji-based `TabIcon` function with proper `Ionicons` from `@expo/vector-icons`
- Active vs inactive: use filled vs outline variants

### Files to modify
- `apps/mobile/app/(tabs)/_layout.tsx` — full rewrite
- `apps/mobile/app/(tabs)/transactions.tsx` — delete
- `apps/mobile/app/(tabs)/add.tsx` — create (dummy placeholder for the tab)

---

## 5. More Page (`app/(tabs)/more.tsx`)

### Current state
- Unicode emoji icons that render inconsistently
- Menu items have `onPress: () => {}` (no navigation)

### Changes

**5a. Fix icons — use Ionicons**
- Profile: `person-outline` (indigo)
- Settings: `settings-outline` (gray)
- Accounts: `business-outline` (blue)
- Categories: `bookmark-outline` (purple)
- Budgets: `wallet-outline` (green)
- Rules: `funnel-outline` (orange)
- Tags: `pricetag-outline` (teal)
- Transactions: `list-outline` (amber)
- Sign Out: `log-out-outline` (red)

**5b. Add navigation using `router.push`**
- Each menu item navigates to a dedicated screen
- These screens will be created as simple placeholder stack screens under a new `app/pages/` directory:
  - `app/pages/accounts.tsx`
  - `app/pages/categories.tsx`
  - `app/pages/budgets.tsx`
  - `app/pages/rules.tsx`
  - `app/pages/tags.tsx`
  - `app/pages/transactions.tsx`
  - `app/pages/profile.tsx`
  - `app/pages/settings.tsx`
- Each placeholder screen: header with back button + title + "Coming soon" centered text
- Add these as Stack screens in `app/_layout.tsx`

**5c. Add Transactions link**
- Add a "Transactions" menu item in the "Finance" section (since we removed the tab)
- Icon: `list-outline` (amber)
- Navigates to `app/pages/transactions.tsx` (can reuse the existing transaction list logic from the deleted tab)

### Files to modify
- `apps/mobile/app/(tabs)/more.tsx` — rewrite with Ionicons + router.push
- `apps/mobile/app/pages/*.tsx` — create 8 placeholder screens
- `apps/mobile/app/_layout.tsx` — add Stack.Screen entries for pages/*

---

## Implementation Order

1. **Install dependencies**: `@expo/vector-icons`, `react-native-svg`
2. **Copy logo.png** to mobile assets
3. **Login + Register screens** — straightforward, no new screens needed
4. **Bottom tab bar** — restructure tabs, add green button, delete transactions tab
5. **More page** — add icons, create placeholder pages, wire navigation
6. **Overview page** — most complex: month picker, summary cards, emoji grid with SVG rings

---

## File Summary

| Action | File |
|--------|------|
| Rewrite | `apps/mobile/app/(auth)/login.tsx` |
| Rewrite | `apps/mobile/app/(auth)/register.tsx` |
| Rewrite | `apps/mobile/app/(tabs)/_layout.tsx` |
| Rewrite | `apps/mobile/app/(tabs)/overview.tsx` |
| Rewrite | `apps/mobile/app/(tabs)/more.tsx` |
| Delete | `apps/mobile/app/(tabs)/transactions.tsx` |
| Create | `apps/mobile/app/(tabs)/add.tsx` |
| Create | `apps/mobile/app/pages/accounts.tsx` |
| Create | `apps/mobile/app/pages/categories.tsx` |
| Create | `apps/mobile/app/pages/budgets.tsx` |
| Create | `apps/mobile/app/pages/rules.tsx` |
| Create | `apps/mobile/app/pages/tags.tsx` |
| Create | `apps/mobile/app/pages/transactions.tsx` |
| Create | `apps/mobile/app/pages/profile.tsx` |
| Create | `apps/mobile/app/pages/settings.tsx` |
| Modify | `apps/mobile/app/_layout.tsx` (add page routes) |
| Copy | `apps/web/public/logo.png` -> `apps/mobile/assets/logo.png` |
