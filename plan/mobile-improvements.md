# Mobile App Improvements Plan

Comprehensive review of `apps/mobile/` codebase. Categorized by priority.

---

## P0 — Bugs (Fix Immediately)

### 1. Transaction detail page broken — uses `search` instead of ID lookup
- **File:** `app/modal/transaction-detail.tsx:33`
- **Issue:** `txApi.list({ pageSize: 1, search: id })` searches the `description` field with `LIKE '%id%'` instead of finding by ID. This never returns the correct transaction.
- **Fix:** Add a `getById(id)` method to the transaction API, or add an ID filter parameter.

### 2. Dark mode broken in multiple places
- **File:** `app/modal/transaction-detail.tsx:174-175` — `borderBottomColor: "#e2e8f0"` hardcoded light color
- **File:** `components/TransactionModal.tsx:290-291` — Toggle button backgrounds `"#fee2e2"` and `"#dcfce7"` don't adapt to dark mode
- **File:** `app/pages/profile.tsx:101` — Success banner `backgroundColor: "#ecfdf5"` hardcoded light color
- **Fix:** Replace with `theme.cardBorder` and dark-mode-aware color values.

---

## P1 — Performance (Fix Before Release)

### 3. API client wrappers recreated on every render
- **Files:** `app/(tabs)/overview.tsx:100-101`, `components/TransactionModal.tsx:42-43`, `app/modal/transaction-detail.tsx:22-23`, `app/pages/profile.tsx:26`
- **Issue:** `createTransactionApi(apiClient)` etc. called in component body = new objects every render.
- **Fix:** Wrap in `useRef` or `useMemo`, or move to module scope.

### 4. Context provider values not memoized — triggers full tree re-renders
- **Files:** `app/_layout.tsx:82-84` (ThemeContext), `app/(tabs)/_layout.tsx:54-63` (ModalContext), `lib/i18n.tsx:62` (I18nContext)
- **Issue:** Provider value objects recreated every render, causing all consumers to re-render.
- **Fix:** Wrap each value in `useMemo`.

### 5. `parseAmount()` called redundantly on same data
- **File:** `app/(tabs)/overview.tsx:252, 265-266, 270-271`
- **Issue:** Called 5+ times per transaction across grouping/totaling passes.
- **Fix:** Parse once per transaction, cache in a mapped array.

### 6. `getShortMonths()` called on every render
- **File:** `app/(tabs)/overview.tsx:170`
- **Issue:** Creates 12 `Intl.DateTimeFormat` instances per render.
- **Fix:** Wrap in `useMemo(() => ..., [locale])`.

### 7. `ProgressRing` component not memoized
- **File:** `app/(tabs)/overview.tsx:60-94`
- **Issue:** Pure component rendered in a loop, re-renders unnecessarily.
- **Fix:** Wrap with `React.memo`.

---

## P2 — Code Cleanup (Before or Shortly After Release)

### 8. Dead code removal
- `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `app/(auth)/_layout.tsx` — Auth screens never navigated to
- `components/AddTransactionOverlay.tsx` — Not imported anywhere
- `lib/addModal.ts` — `AddModalContext` and `useAddModal()` backward compat exports unused
- `app/modal/transaction-detail.tsx` — Registered in Stack but never navigated to
- `lib/auth.ts` — `AuthContext` never provided
- **Fix:** Delete all dead files. Remove `(auth)` and `modal/transaction-detail` from Stack.

### 9. Duplicated type definitions
- `type ThemeSetting = "light" | "dark" | "system"` defined in both `app/_layout.tsx:13` and `app/pages/settings.tsx:18`
- **Fix:** Export from `lib/themeContext.ts`.

### 10. Hardcoded English strings bypass i18n
- `app/modal/transaction-detail.tsx:55, 92-97, 107-108, 114, 127` — "Delete Transaction", "Are you sure?", "Close", etc.
- `components/PlaceholderScreen.tsx:18` — "Coming soon"
- `app/_layout.tsx:112-137` — Stack screen `title` and `headerBackTitle` values
- **Fix:** Replace with `i18n()` calls.

### 11. Hardcoded "USD" currency
- `app/(tabs)/overview.tsx:348, 362, 374, 431`
- **Fix:** Read from user settings or account data.

### 12. Unused dependency: `expo-haptics`
- Listed in `package.json` but never imported.
- **Fix:** Remove, or add haptic feedback on key interactions (add/delete transaction).

---

## P3 — iOS Polish (Post-Release Improvements)

### 13. Hardcoded layout values ignore safe area insets
- `app/(tabs)/_layout.tsx:72-73` — Tab bar `height: 82, paddingBottom: 16`
- `app/(tabs)/_layout.tsx:140` — FAB `bottom: 34`
- `components/TransactionModal.tsx:387` — Modal `paddingBottom: 112`
- **Fix:** Use `useSafeAreaInsets().bottom` to compute dynamic padding.

### 14. Keyboard offset uses magic number
- `components/TransactionModal.tsx:132` — `-(e.endCoordinates.height * 0.6)` may not work for all keyboard heights (e.g., Chinese keyboard with suggestions bar).
- **Fix:** Measure the description input position and compute exact offset, or use `KeyboardAvoidingView`.

### 15. `SCREEN_HEIGHT` captured at module load time
- `components/TransactionModal.tsx:26` — Stale if screen dimensions change (iPad split-screen).
- **Fix:** Use `useWindowDimensions()` or `Dimensions.addEventListener`.

### 16. `new Date()` in render body
- `app/(tabs)/overview.tsx:112` — `now` changes every render, causes stale closure in effects.
- **Fix:** Move to `useRef` or compute once in state initializer.

---

## P4 — Accessibility (Post-Release)

### 17. No accessibility labels on interactive elements
- FAB button (`_layout.tsx:121-129`)
- Month pills (`overview.tsx:318-333`)
- Category emoji chips (`overview.tsx:408-433`)
- Expense/Income toggle (`TransactionModal.tsx:289-301`)
- **Fix:** Add `accessibilityLabel` and `accessibilityRole="button"` to all `TouchableOpacity` elements.

### 18. Touch targets too small
- `app/modal/transaction-detail.tsx:91` — "Close" and "Delete" buttons are plain Text without minimum 44x44pt touch area.
- **Fix:** Wrap in `TouchableOpacity` with `minHeight: 44, minWidth: 44`.

---

## P5 — Future Optimizations (Nice to Have)

### 19. SQLite batching for seed and bulk operations
- `lib/db/database.ts:168-173` — Category seeding: individual INSERTs without transaction
- `lib/db/local-client.ts:380-385` — Tag insertion in loop
- `lib/db/local-client.ts:709-714, 753-758` — Budget category insertion in loop
- **Fix:** Wrap in `BEGIN/COMMIT` transaction blocks.

### 20. Virtualized lists for large datasets
- `app/(tabs)/overview.tsx:444-469` — Expanded transaction list uses `.map()` in a `View`
- `app/(tabs)/overview.tsx:312-334` — Month pills could grow unbounded for users with years of data
- **Fix:** Replace with `FlatList` for expanded transactions. Consider `FlatList` for month pills.

### 21. Use `react-native-reanimated` for gesture-driven animations
- PanResponder-based month swiping (`overview.tsx:124-149`) runs on JS thread
- All animations use old `Animated` API
- **Fix:** Migrate to Reanimated + Gesture Handler for smoother 60fps gestures.

### 22. `SlotDigit` strip array created every render
- `components/SlotNumber.tsx:44-45` — `Array.from(...)` not memoized
- **Fix:** Wrap in `useMemo`.

### 23. Race conditions in async effects
- `app/(tabs)/overview.tsx:186-190` — No abort/cancellation for async `fetchData`
- `app/modal/transaction-detail.tsx:30-41` — Same pattern
- **Fix:** Add `AbortController` or stale-closure guard.
