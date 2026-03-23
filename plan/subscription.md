# In-App Subscription Plan

## Overview

Implement iOS App Store subscriptions to gate "Pro" features behind a paid plan. Uses Apple's StoreKit 2 directly via `react-native-iap` (a thin native bridge, no third-party service dependency). All receipt validation and subscription status is handled by StoreKit 2 on-device — no server needed.

## Technology Choice: react-native-iap + StoreKit 2

**Why `react-native-iap`:**
- Thin bridge to Apple's native StoreKit 2 — no third-party service, no API keys, no accounts
- StoreKit 2 handles receipt validation on-device (signed JWS transactions)
- Subscription status queryable directly from StoreKit
- Restore purchases is a native StoreKit call
- Works with Expo via config plugin (`expo-dev-client` required)
- No revenue share with a middleman

**Package:** `react-native-iap` + `expo-dev-client`

## App Store Connect Setup (Prerequisites)

1. **Apple Developer Account** — Paid enrollment required ($99/year)
2. **App registered** in App Store Connect with bundle ID `com.moneytracker.app`
3. **Subscription Group** — Create group "Money Tracker Pro" under Subscriptions
4. **Products:**
   - `com.moneytracker.pro.monthly` — Monthly auto-renewable subscription
   - `com.moneytracker.pro.yearly` — Yearly auto-renewable subscription (optional)
5. **Pricing** — Set price tiers in App Store Connect
6. **StoreKit Configuration File** — Create in Xcode for local testing without App Store Connect

## Implementation Plan

### Phase 1: Install & Configure

1. Install dependencies:
   ```
   npm install react-native-iap expo-dev-client --workspace=apps/mobile
   ```

2. Update `app.config.ts`:
   - Add `expo-dev-client` plugin

3. Create `apps/mobile/lib/store.ts`:
   - Product IDs constants
   - Initialize StoreKit connection on app start
   - Helper functions for purchase, restore, status check

### Phase 2: Subscription State (`apps/mobile/lib/subscription.tsx`)

Create a React context to track subscription status app-wide:

```typescript
interface SubscriptionContextValue {
  isPro: boolean;                    // Active pro subscription?
  loading: boolean;                  // Still checking status?
  products: Product[];               // Available products with pricing
  purchase: (productId: string) => Promise<void>;
  restore: () => Promise<boolean>;
}
```

**How it works:**
- On app launch, call `RNIap.getAvailablePurchases()` to check existing subscriptions
- Check if any purchase matches our pro product IDs and is still valid
- Cache `isPro` in context so all screens can read it
- Also persist `isPro` to AsyncStorage/SQLite for instant UI on next launch (StoreKit re-validates in background)

### Phase 3: Store Helper (`apps/mobile/lib/store.ts`)

```typescript
import * as RNIap from 'react-native-iap';

export const PRODUCT_IDS = [
  'com.moneytracker.pro.monthly',
  'com.moneytracker.pro.yearly',
];

export async function initStore() {
  await RNIap.initConnection();
}

export async function getProducts() {
  return RNIap.getSubscriptions({ skus: PRODUCT_IDS });
}

export async function purchaseProduct(productId: string) {
  await RNIap.requestSubscription({ sku: productId });
}

export async function restorePurchases() {
  return RNIap.getAvailablePurchases();
}

export async function checkActiveSubscription(): Promise<boolean> {
  const purchases = await RNIap.getAvailablePurchases();
  return purchases.some(p => PRODUCT_IDS.includes(p.productId));
}

export async function endStore() {
  await RNIap.endConnection();
}
```

### Phase 4: Paywall UI (`apps/mobile/components/ProPaywall.tsx`)

A modal shown when user taps "Unlock Pro":

**Content:**
- Feature list (what Pro unlocks): accounts, transactions list, categories, budgets, rules, tags
- Subscription cards showing price from StoreKit (localized by Apple)
- "Subscribe" button -> triggers `RNIap.requestSubscription()`
- "Restore Purchases" link -> calls `RNIap.getAvailablePurchases()`
- Terms of Service / Privacy Policy links (required by Apple Review)
- Close / dismiss button

**Flow:**
1. User taps "Unlock Pro" on More page
2. Paywall modal opens
3. `getProducts()` fetches live pricing from App Store
4. User taps a plan -> Apple payment sheet appears natively
5. Listen for `purchaseUpdatedListener` -> on success, set `isPro = true`, close modal
6. On cancel/failure -> show message, stay on paywall

### Phase 5: Gate Pro Features

**Files to modify:**

- `apps/mobile/app/_layout.tsx`:
  - Initialize StoreKit connection
  - Wrap app with `SubscriptionProvider`
  - Clean up StoreKit connection on unmount

- `apps/mobile/app/(tabs)/more.tsx`:
  - Read `isPro` from context
  - If `isPro`: show pro items as tappable with chevron icons
  - If not: show locked state (current) + "Unlock Pro" opens paywall

- `apps/mobile/app/(tabs)/_layout.tsx`:
  - No changes needed (provider is in root layout)

### Phase 6: Restore Purchases

**Where "Restore" appears:**
1. On the paywall modal (always visible, required by Apple)
2. In Settings page (dedicated "Restore Purchases" row)

**How it works:**
```typescript
async function restore(): Promise<boolean> {
  const purchases = await RNIap.getAvailablePurchases();
  const hasActive = purchases.some(p => PRODUCT_IDS.includes(p.productId));
  setIsPro(hasActive);
  return hasActive;
}
```
- StoreKit checks the user's Apple ID for any active subscriptions
- Works across device changes — tied to Apple ID, not our app data
- If found -> unlock pro, show success
- If not found -> show "No active subscription found"

## Purchase Listener Pattern

```typescript
useEffect(() => {
  const purchaseListener = RNIap.purchaseUpdatedListener(async (purchase) => {
    // Finish the transaction (required by Apple)
    await RNIap.finishTransaction({ purchase, isConsumable: false });
    // Update state
    setIsPro(true);
  });

  const errorListener = RNIap.purchaseErrorListener((error) => {
    if (error.code !== 'E_USER_CANCELLED') {
      Alert.alert('Purchase failed', error.message);
    }
  });

  return () => {
    purchaseListener.remove();
    errorListener.remove();
  };
}, []);
```

## File Changes Summary

| Action | Files |
|--------|-------|
| **New** | `apps/mobile/lib/store.ts` (StoreKit helpers), `apps/mobile/lib/subscription.tsx` (context + provider), `apps/mobile/components/ProPaywall.tsx` (paywall UI) |
| **Modify** | `apps/mobile/app/_layout.tsx` (init StoreKit, wrap with provider), `apps/mobile/app/(tabs)/more.tsx` (conditional pro UI, open paywall), `apps/mobile/app/pages/settings.tsx` (add restore button), `apps/mobile/app.config.ts` (add plugins), `apps/mobile/package.json` (add deps), i18n files (new strings) |

## Apple Review Requirements

- Subscriptions must auto-renew through Apple (no external payment links)
- Must include "Restore Purchases" button (visible without purchasing)
- Must show subscription terms before purchase: price, duration, auto-renewal policy
- Must link to Terms of Service and Privacy Policy
- Free features must be usable without subscription (casual mode satisfies this)
- App must not lock existing free functionality behind a paywall after update

## Testing

- **Local:** Create StoreKit Configuration file in Xcode for sandbox testing without App Store Connect
- **Sandbox:** Use sandbox Apple ID in TestFlight builds
- **Test scenarios:**
  - Fresh purchase (monthly, yearly)
  - Cancel subscription -> verify expiration
  - Restore on new device
  - Purchase while offline -> deferred transaction
  - User cancels payment sheet
  - Subscription renewal
