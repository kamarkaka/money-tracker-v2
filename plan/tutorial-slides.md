# Tutorial Slides — Casual & Pro

## Context
The app has many features across two tiers but no way to introduce them to new users. We need swipeable tutorial slides that show automatically on first launch and after Pro purchase, and are always replayable from Settings.

---

## 1. Slide Content

### Casual Tutorial (6 slides)

| # | Title | Icon | Content |
|---|-------|------|---------|
| 1 | Welcome to Money Tracker | `wallet-outline` | Your personal finance companion. Track expenses, manage accounts, and stay on top of your money — all stored privately on your device. |
| 2 | Your Monthly Overview | `pie-chart-outline` | See income, expenses, and net savings at a glance. Tap month pills to navigate, or edge-swipe between months. Trend arrows show how you're doing vs. last month. |
| 3 | Emoji Spending Breakdown | `happy-outline` | Each circle represents a spending category. The ring shows its share of your total. Tap any transaction to edit it. |
| 4 | Add Transactions | `add-circle-outline` | Tap the green **+** button anytime. Pick an emoji category, type digits (decimal auto-placed), add an optional note. Quick-fill pills let you re-use frequent transactions. Long-press any existing transaction to duplicate it. |
| 5 | Manage Accounts | `business-outline` | Add accounts manually with institution name, account type, and balance. Swipe left on any account to delete it. Tap the eye icon to hide an account from reports. |
| 6 | Data & Settings | `settings-outline` | **Export** all data as a ZIP of CSV files. **Import** from a previous export to restore. Switch between light, dark, or system theme. Change language anytime. |

### Pro Tutorial (8 slides)

| # | Title | Icon | Content |
|---|-------|------|---------|
| 1 | Welcome to Pro | `star-outline` | You've unlocked the full experience. Customizable navigation, budgets, tags, rules, bank linking, and more. |
| 2 | Custom Navigation Bar | `apps-outline` | Pick 1–4 tabs from 7 available sections. Drag to reorder in Settings → Bottom Bar. Everything is also accessible from the More menu. |
| 3 | Budget Tracking | `wallet-outline` | Create budgets with monthly limits. Assign categories to each budget. On the Overview, budget cards show progress bars with spending vs. limit. "Others" and "Uncategorized" groups catch the rest. |
| 4 | Category Hierarchy | `bookmark-outline` | Build parent/child category trees. The transaction modal shows a dropdown with the full hierarchy. Choose from 63 icons (vs. 24 in free tier). |
| 5 | Tags | `pricetag-outline` | Create color-coded tags and attach them to transactions. Tag dots appear on transaction rows. Expand a tag to see all its transactions and totals. |
| 6 | Auto-Categorization Rules | `funnel-outline` | Create rules that match transaction descriptions to categories. Rules auto-apply during bank sync. A rule is also auto-created whenever you manually categorize a transaction. |
| 7 | Bank Linking (Plaid) | `link-outline` | Link bank accounts to auto-import transactions. Two modes: use our server (just log in) or bring your own Plaid API keys. Refresh anytime; unlink to keep data but stop syncing. |
| 8 | Extra Features | `sparkles-outline` | **Setup Checklist** guides your first steps. **Fireworks** celebrate positive savings (toggle in Settings). **Search & Filters** narrow transactions by account, category, date, or amount. **Account hide/show** excludes accounts from reports without deleting. |

---

## 2. Architecture

### New File
- **`apps/mobile/components/Tutorial.tsx`** — Full-screen `<Modal>` with horizontal `ScrollView pagingEnabled`

### Modified Files

| File | Change |
|------|--------|
| `lib/db/database.ts` | Migration: `ALTER TABLE settings ADD COLUMN tutorial_casual_seen INTEGER DEFAULT 0` + `tutorial_pro_seen INTEGER DEFAULT 0` |
| `lib/db/local-client.ts` | Add `tutorialCasualSeen` / `tutorialProSeen` to `getSettings()` return object and `updateSettings()` handler |
| `app/_layout.tsx` | Load tutorial flags at startup; add state + render `<Tutorial>` component; on close, persist seen flag |
| `lib/subscription.tsx` | On purchase success (line 148), check `tutorial_pro_seen` — if false, trigger pro tutorial |
| `app/pages/settings.tsx` | Add "View Tutorial" section with buttons for casual (always) and pro (if isPro) |
| `assets/i18n/en.json` | Add `tutorialSlides.casual.*` and `tutorialSlides.pro.*` keys |
| `assets/i18n/zh.json` | Add corresponding Chinese translations |

---

## 3. Component Design: `Tutorial.tsx`

```
Props:
  visible: boolean
  variant: "casual" | "pro"
  onClose: () => void

Internal:
  currentPage: number (tracked via ScrollView onScroll)
  scrollViewRef: for programmatic scrolling on "Next" press

Layout:
  <Modal visible={visible} animationType="fade" statusBarTranslucent>
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Close button (X) — top-right, always visible */}
      <TouchableOpacity onPress={onClose}>
        <Ionicons name="close" />
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => setCurrentPage(Math.round(e.nativeEvent.contentOffset.x / screenWidth))}
        scrollEventThrottle={16}
      >
        {slides.map((slide, i) => (
          <View key={i} style={{ width: screenWidth }}>
            <Ionicons name={slide.icon} size={64} color={theme.brand} />
            <Text style={titleStyle}>{slide.title}</Text>
            <Text style={descStyle}>{slide.description}</Text>
            {slide.bullets?.map(b => <BulletRow icon={b.icon} text={b.text} />)}
          </View>
        ))}
      </ScrollView>

      {/* Page dots */}
      <View style={dotsRow}>
        {slides.map((_, i) => <View style={[dot, i === currentPage && activeDot]} />)}
      </View>

      {/* Next / Get Started button */}
      <TouchableOpacity onPress={isLastPage ? onClose : scrollToNext}>
        <Text>{isLastPage ? "Get Started" : "Next"}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  </Modal>
```

- Follows `ProPaywall.tsx` modal pattern (RN `<Modal>`)
- Uses `useAppTheme()` for colors, `useI18n()` for strings
- No new dependencies — native `ScrollView` pagingEnabled handles swipe

---

## 4. Persistence (following `checklistDismissed` pattern)

**database.ts** migration:
```typescript
try {
  await database.runAsync("ALTER TABLE settings ADD COLUMN tutorial_casual_seen INTEGER DEFAULT 0");
  await database.runAsync("ALTER TABLE settings ADD COLUMN tutorial_pro_seen INTEGER DEFAULT 0");
} catch { /* already exists */ }
```

**local-client.ts getSettings():**
```typescript
tutorialCasualSeen: !!(row?.tutorial_casual_seen as number),
tutorialProSeen: !!(row?.tutorial_pro_seen as number),
```

**local-client.ts updateSettings():**
```typescript
if (body.tutorialCasualSeen !== undefined) {
  sets.push("tutorial_casual_seen = ?"); args.push(body.tutorialCasualSeen ? 1 : 0);
}
if (body.tutorialProSeen !== undefined) {
  sets.push("tutorial_pro_seen = ?"); args.push(body.tutorialProSeen ? 1 : 0);
}
```

---

## 5. Trigger Logic

### First launch (casual)
In `_layout.tsx`, after settings load completes:
- Read `tutorialCasualSeen` from settings
- If false, set `showTutorial = { variant: "casual" }` state
- On close callback: `settingsApi.update({ tutorialCasualSeen: true })`

### Pro purchase
In `subscription.tsx` purchase listener (line 147-148):
- After `setIsPro(true)` + `persistIsPro(true)`, read `tutorial_pro_seen` from SQLite
- If false, invoke a callback to show the pro tutorial
- The callback is passed via a new optional prop or a lightweight event (e.g., a ref callback stored in ThemeContext, or a simple event emitter)
- Simplest approach: add `onProPurchase?: () => void` callback to `SubscriptionProvider`, set in `_layout.tsx`

### Settings replay
- "View Casual Tutorial" button always visible
- "View Pro Tutorial" button visible only when `isPro`
- These set `showTutorial` state directly without updating the "seen" flags

---

## 6. Settings Page Addition

In `apps/mobile/app/pages/settings.tsx`, add a new card section (before Data Management):

```
Tutorial
  ├── "View Casual Tutorial" button (always)
  └── "View Pro Tutorial" button (only if isPro)
```

Follows existing card + row pattern. Each row is a `TouchableOpacity` that sets tutorial visible.

---

## 7. Implementation Order

1. Database migration + LocalClient settings handlers
2. `Tutorial.tsx` component with all slide content
3. i18n strings (en.json + zh.json)
4. `_layout.tsx` — first-launch trigger + Tutorial render
5. `subscription.tsx` — pro-purchase trigger
6. `settings.tsx` — replay buttons

---

## 8. Verification
- `cd apps/mobile && npx tsc --noEmit`
- Clear app data → launch → casual tutorial appears → swipe through → close → relaunch → no tutorial
- Purchase Pro → pro tutorial appears → close → doesn't show again
- Settings → tap "View Tutorial" → slides appear, swipeable, closeable
