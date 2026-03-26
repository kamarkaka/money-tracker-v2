import { Platform } from "react-native";

export const PRODUCT_IDS = [
  "money.tracker.2.pro.subscription.monthly",
  "money.tracker.2.pro.subscription.annual",
];

// Import react-native-iap directly — it will throw at call time if native module is missing (e.g., Expo Go)
let iap: any = null;
if (Platform.OS === "ios") {
  try {
    iap = require("react-native-iap");
  } catch (e) {
    console.log("[IAP] require error:", e);
  }
}

export async function initStore(): Promise<void> {
  console.log("[IAP] iap loaded:", !!iap);
  if (!iap) return;
  await iap.initConnection();
  console.log("[IAP] Connection initialized");
}

export async function getProducts(): Promise<any[]> {
  if (!iap) {
    console.log("[IAP] No IAP module, returning empty products");
    return [];
  }
  try {
    const result = await iap.fetchProducts({ skus: PRODUCT_IDS, type: "subs" });
    console.log("[IAP] Products fetched:", result?.length ?? 0, JSON.stringify(result));
    return result ?? [];
  } catch (e) {
    console.log("[IAP] fetchProducts error:", e);
    return [];
  }
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
    onPurchase(purchase);
    try {
      await iap.finishTransaction({ purchase, isConsumable: false });
    } catch {
      // ignore — purchase already granted
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
