import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Modal,
  Animated,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";
import { useSubscription } from "@/lib/subscription";
import { PRODUCT_IDS } from "@/lib/store";
import type { StoreProduct } from "@/lib/subscription";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const FEATURES = [
  { icon: "business-outline" as const, key: "paywall.featureAccounts" },
  { icon: "list-outline" as const, key: "paywall.featureTransactions" },
  { icon: "bookmark-outline" as const, key: "paywall.featureCategories" },
  { icon: "wallet-outline" as const, key: "paywall.featureBudgets" },
  { icon: "funnel-outline" as const, key: "paywall.featureRules" },
  { icon: "pricetag-outline" as const, key: "paywall.featureTags" },
];

export function ProPaywall({ visible, onClose }: Props) {
  const { theme } = useAppTheme();
  const { i18n } = useI18n();
  const { products, purchase, restore } = useSubscription();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(backdropAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const handlePurchase = async (productId: string) => {
    setPurchasing(true);
    try {
      await purchase(productId);
      onClose();
    } catch {
      // Error handled by purchaseErrorListener
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restore();
      if (restored) {
        Alert.alert(i18n("common.success"), i18n("paywall.restoreSuccess"));
        onClose();
      } else {
        Alert.alert(i18n("paywall.restoreFailed"), i18n("paywall.noSubscription"));
      }
    } catch {
      Alert.alert(i18n("common.error"), i18n("common.error"));
    } finally {
      setRestoring(false);
    }
  };

  const monthly = products.find((p: StoreProduct) => p.id?.includes("monthly"));
  const yearly = products.find((p: StoreProduct) => p.id?.includes("annual"));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={{ position: "absolute", top: -1000, left: 0, right: 0, bottom: 0, backgroundColor: theme.backdrop, opacity: backdropAnim }} />
      </TouchableWithoutFeedback>
      <View style={[styles.container, { backgroundColor: theme.card }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{i18n("paywall.title")}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {i18n("paywall.subtitle")}
        </Text>

        {/* Feature list */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.key} style={styles.featureRow}>
              <Ionicons name={f.icon} size={20} color={theme.brand} />
              <Text style={[styles.featureText, { color: theme.text }]}>{i18n(f.key)}</Text>
            </View>
          ))}
        </View>

        {/* Subscription options */}
        {products.length === 0 ? (
          <View style={styles.loadingProducts}>
            <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: "center" }}>
              {i18n("paywall.unavailable")}
            </Text>
          </View>
        ) : (
          <View style={styles.plans}>
            {monthly && (
              <TouchableOpacity
                style={[styles.planBtn, { backgroundColor: theme.brand }]}
                onPress={() => handlePurchase(monthly.id || PRODUCT_IDS[0])}
                disabled={purchasing}
                activeOpacity={0.8}
              >
                <Text style={[styles.planTitle, { color: theme.brandText }]}>
                  {i18n("paywall.monthly")}
                </Text>
                <Text style={[styles.planPrice, { color: theme.brandText }]}>
                  {monthly.displayPrice}/{i18n("paywall.mo")}
                </Text>
              </TouchableOpacity>
            )}
            {yearly && (
              <TouchableOpacity
                style={[styles.planBtn, { backgroundColor: theme.brand }]}
                onPress={() => handlePurchase(yearly.id || PRODUCT_IDS[1])}
                disabled={purchasing}
                activeOpacity={0.8}
              >
                <Text style={[styles.planTitle, { color: theme.brandText }]}>
                  {i18n("paywall.yearly")}
                </Text>
                <Text style={[styles.planPrice, { color: theme.brandText }]}>
                  {yearly.displayPrice}/{i18n("paywall.yr")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {purchasing && (
          <ActivityIndicator size="small" color={theme.brand} style={{ marginTop: 12 }} />
        )}

        {/* Restore */}
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={restoring}
          activeOpacity={0.7}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={theme.textSecondary} />
          ) : (
            <Text style={[styles.restoreText, { color: theme.textSecondary }]}>
              {i18n("paywall.restore")}
            </Text>
          )}
        </TouchableOpacity>

        {/* Legal links */}
        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => Linking.openURL("https://github.com/kamarkaka/money-tracker-v2/wiki/Privacy-Policy")}>
            <Text style={[styles.legalText, { color: theme.textSecondary }]}>{i18n("paywall.privacy")}</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.cardBorder }}> | </Text>
          <TouchableOpacity onPress={() => Linking.openURL("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")}>
            <Text style={[styles.legalText, { color: theme.textSecondary }]}>{i18n("paywall.terms")}</Text>
          </TouchableOpacity>
        </View>

        {/* Auto-renewal notice */}
        <Text style={[styles.renewalNotice, { color: theme.textSecondary }]}>
          {i18n("paywall.renewalNotice")}
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 16,
    paddingBottom: 34,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  features: {
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    fontWeight: "500",
  },
  loadingProducts: {
    alignItems: "center",
    paddingVertical: 20,
  },
  plans: {
    gap: 10,
  },
  planBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  planPrice: {
    fontSize: 16,
    fontWeight: "600",
  },
  restoreBtn: {
    alignItems: "center",
    paddingVertical: 16,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: "600",
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  legalText: {
    fontSize: 12,
  },
  renewalNotice: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
});
