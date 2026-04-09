import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { Alert } from "react-native";
import { initStore, endStore, getProducts, checkActiveSubscription, purchaseSubscription, restorePurchases, setupListeners, PRODUCT_IDS } from "./store";
import { getDatabase } from "./db";
import { useAppTheme } from "./themeContext";
import { verifySubscriptionViaBackend } from "./plaid/backend-client";

/**
 * Sync the local subscription status to the backend.
 * Tries StoreKit receipt first; falls back to client attestation if StoreKit is unavailable.
 * @param isPro — pass the current isPro state from the app (accounts for dev mode override)
 */
export async function syncSubscriptionToBackend(isPro: boolean): Promise<boolean> {
  if (!isPro) return false;

  try {
    // Try to get a real receipt from StoreKit
    const purchases = await restorePurchases();
    const activePurchase = purchases.find((p: any) => PRODUCT_IDS.includes(p.productId));

    if (activePurchase) {
      const jws = activePurchase.transactionReceipt;
      if (jws && typeof jws === "string") {
        await verifySubscriptionViaBackend(jws);
        return true;
      }
    }

    // Fallback: StoreKit unavailable (simulator/Expo Go) or no receipt.
    // The caller already confirmed isPro, so attest to the backend.
    await verifySubscriptionViaBackend("LOCAL_PRO");
    return true;
  } catch {
    return false;
  }
}

export interface StoreProduct {
  id?: string | null;
  displayPrice: string;
  displayName?: string | null;
}

interface SubscriptionContextValue {
  isPro: boolean;
  loading: boolean;
  products: StoreProduct[];
  purchase: (productId: string) => Promise<void>;
  restore: () => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  isPro: false,
  loading: true,
  products: [],
  purchase: async () => {},
  restore: async () => false,
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [isPro, setIsProState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const { setIsPro: setThemeIsPro } = useAppTheme();

  const setIsPro = useCallback((value: boolean) => {
    setIsProState(value);
    setThemeIsPro(value);
  }, [setThemeIsPro]);

  const persistIsPro = useCallback(async (value: boolean) => {
    try {
      const db = await getDatabase();
      await db.runAsync(
        "UPDATE settings SET mode = ? WHERE id = 'default'",
        [value ? "pro" : "casual"],
      );
    } catch {
      // ignore
    }
  }, []);

  /** Send JWS to backend if authenticated, so server knows subscription is active */
  const verifyWithBackend = useCallback(async (purchase: any) => {
    try {
      const jws = purchase?.transactionReceipt;
      if (jws && typeof jws === "string") {
        await verifySubscriptionViaBackend(jws);
      }
    } catch {
      // Non-critical: backend verification failed, local subscription still works
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      // Load cached status from SQLite for instant UI
      try {
        const db = await getDatabase();
        const row = await db.getFirstAsync<{ mode: string }>(
          "SELECT mode FROM settings WHERE id = 'default'",
        );
        if (mounted && row?.mode === "pro") {
          setIsPro(true);
        }
      } catch {
        // ignore
      }

      // Verify with StoreKit
      try {
        await initStore();
        const active = await checkActiveSubscription();
        if (mounted) {
          setIsPro(active);
          persistIsPro(active);
        }

        try {
          const prods = await getProducts();
          if (mounted) setProducts(prods as StoreProduct[]);
        } catch {
          // Products may fail in simulator
        }
      } catch {
        // StoreKit init may fail in simulator / Expo Go
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      endStore();
    };
  }, []);

  // Listen for purchase updates
  useEffect(() => {
    const listener = setupListeners(
      (purchase: any) => {
        setIsPro(true);
        persistIsPro(true);
        verifyWithBackend(purchase);
      },
      (error: { message?: string }) => {
        Alert.alert("Purchase failed", error.message || "An error occurred");
      },
    );
    return () => listener.remove();
  }, [setIsPro, persistIsPro]);

  const purchase = useCallback(async (productId: string) => {
    await purchaseSubscription(productId);
    // Fallback: verify subscription if listener hasn't already handled it
    if (!isPro) {
      try {
        const active = await checkActiveSubscription();
        if (active) {
          setIsPro(true);
          persistIsPro(true);
        }
      } catch {
        // ignore
      }
    }
  }, [isPro, setIsPro, persistIsPro]);

  const restore = useCallback(async (): Promise<boolean> => {
    try {
      const purchases = await restorePurchases();
      const activePurchase = purchases.find((p: any) => PRODUCT_IDS.includes(p.productId));
      const hasActive = !!activePurchase;
      setIsPro(hasActive);
      persistIsPro(hasActive);
      if (hasActive && activePurchase) {
        verifyWithBackend(activePurchase);
      }
      return hasActive;
    } catch {
      return false;
    }
  }, [verifyWithBackend]);

  const value = useMemo(
    () => ({ isPro, loading, products, purchase, restore }),
    [isPro, loading, products, purchase, restore],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}
