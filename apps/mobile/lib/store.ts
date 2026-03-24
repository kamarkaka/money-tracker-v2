import { NativeModules, Platform } from "react-native";

export const PRODUCT_IDS = [
  "com.moneytracker.pro.monthly",
  "com.moneytracker.pro.yearly",
];

// Check if native IAP module is available (dev build vs Expo Go)
const HAS_IAP = Platform.OS === "ios" && !!NativeModules.RNIapIos;

// Only import when native module exists — guarded by HAS_IAP before every call
let iap: any = null;
if (HAS_IAP) {
  try {
    iap = require("react-native-iap");
  } catch {
    // ignore
  }
}

export async function initStore(): Promise<void> {
  if (!iap) return;
  await iap.initConnection();
}

export async function getProducts(): Promise<any[]> {
  if (!iap) return [];
  const result = await iap.fetchProducts({ skus: PRODUCT_IDS, type: "subs" });
  return result ?? [];
}

export async function purchaseSubscription(productId: string): Promise<void> {
  if (!iap) return;
  await iap.requestPurchase({
    type: "subs",
    request: { apple: { sku: productId } },
  });
}

export async function restorePurchases(): Promise<any[]> {
  if (!iap) return [];
  return iap.getAvailablePurchases();
}

export async function checkActiveSubscription(): Promise<boolean> {
  if (!iap) return false;
  try {
    const purchases = await iap.getAvailablePurchases();
    return purchases.some((p: any) => PRODUCT_IDS.includes(p.productId));
  } catch {
    return false;
  }
}

export async function endStore(): Promise<void> {
  if (!iap) return;
  await iap.endConnection();
}

export function setupListeners(
  onPurchase: (purchase: any) => void,
  onError: (error: any) => void,
): { remove: () => void } {
  if (!iap) return { remove: () => {} };

  const purchaseSub = iap.purchaseUpdatedListener(async (purchase: any) => {
    try {
      await iap.finishTransaction({ purchase, isConsumable: false });
      onPurchase(purchase);
    } catch {
      // ignore
    }
  });

  const errorSub = iap.purchaseErrorListener((error: any) => {
    if (error.code !== "user-cancelled") {
      onError(error);
    }
  });

  return {
    remove: () => {
      purchaseSub.remove();
      errorSub.remove();
    },
  };
}
