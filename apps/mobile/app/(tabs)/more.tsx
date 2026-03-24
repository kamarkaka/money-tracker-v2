import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";
import { MENU_COLORS } from "@/lib/colors";
import { useSubscription } from "@/lib/subscription";
import { ProPaywall } from "@/components/ProPaywall";

interface MenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  route: string;
}

export default function MoreScreen() {
  const { theme } = useAppTheme();
  const { i18n } = useI18n();
  const router = useRouter();
  const { isPro } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const settingsItems: MenuItem[] = [
    { label: i18n("nav.setting"), icon: "settings-outline", iconColor: MENU_COLORS.settings, route: "/pages/settings" },
  ];

  const proItems: MenuItem[] = [
    { label: i18n("nav.account"), icon: "business-outline", iconColor: MENU_COLORS.accounts, route: "/pages/accounts" },
    { label: i18n("nav.transaction"), icon: "list-outline", iconColor: MENU_COLORS.transactions, route: "/pages/transactions" },
    { label: i18n("nav.category"), icon: "bookmark-outline", iconColor: MENU_COLORS.categories, route: "/pages/categories" },
    { label: i18n("nav.budget"), icon: "wallet-outline", iconColor: MENU_COLORS.budgets, route: "/pages/budgets" },
    { label: i18n("nav.rule"), icon: "funnel-outline", iconColor: MENU_COLORS.rules, route: "/pages/rules" },
    { label: i18n("nav.tag"), icon: "pricetag-outline", iconColor: MENU_COLORS.tags, route: "/pages/tags" },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
    >
      {/* Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {i18n("nav.setting")}
        </Text>
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
          ]}
        >
          {settingsItems.map((item, ii) => (
            <TouchableOpacity
              key={ii}
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.6}
            >
              <View
                style={[styles.iconCircle, { backgroundColor: item.iconColor + "18" }]}
              >
                <Ionicons name={item.icon} size={20} color={item.iconColor} />
              </View>
              <Text style={{ color: theme.text, fontSize: 16, flex: 1 }}>
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Pro Features */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {i18n("more.proFeatures")}
        </Text>

        {!isPro && (
          <TouchableOpacity
            style={[styles.unlockBtn, { backgroundColor: theme.brand }]}
            activeOpacity={0.8}
            onPress={() => setShowPaywall(true)}
          >
            <Ionicons name="lock-open-outline" size={18} color={theme.brandText} />
            <Text style={[styles.unlockBtnText, { color: theme.brandText }]}>{i18n("more.unlockPro")}</Text>
          </TouchableOpacity>
        )}

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
            !isPro && { opacity: 0.5 },
          ]}
        >
          {proItems.map((item, ii) => {
            const ItemWrapper = isPro ? TouchableOpacity : View;
            return (
              <ItemWrapper
                key={ii}
                style={[
                  styles.menuItem,
                  ii < proItems.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.cardBorder,
                  },
                ]}
                {...(isPro ? { onPress: () => router.push(item.route as any), activeOpacity: 0.6 } : {})}
              >
                <View
                  style={[styles.iconCircle, { backgroundColor: item.iconColor + "18" }]}
                >
                  <Ionicons name={item.icon} size={20} color={item.iconColor} />
                </View>
                <Text style={{ color: theme.text, fontSize: 16, flex: 1 }}>
                  {item.label}
                </Text>
                <Ionicons
                  name={isPro ? "chevron-forward" : "lock-closed"}
                  size={isPro ? 18 : 16}
                  color={theme.textSecondary}
                />
              </ItemWrapper>
            );
          })}
        </View>
      </View>
      <ProPaywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  unlockBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
