import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";

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

  const settingsItems: MenuItem[] = [
    { label: i18n("nav.setting"), icon: "settings-outline", iconColor: "#71717a", route: "/pages/settings" },
  ];

  const proItems: MenuItem[] = [
    { label: i18n("nav.account"), icon: "business-outline", iconColor: "#3b82f6", route: "/pages/accounts" },
    { label: i18n("nav.transaction"), icon: "list-outline", iconColor: "#f59e0b", route: "/pages/transactions" },
    { label: i18n("nav.category"), icon: "bookmark-outline", iconColor: "#8b5cf6", route: "/pages/categories" },
    { label: i18n("nav.budget"), icon: "wallet-outline", iconColor: "#10b981", route: "/pages/budgets" },
    { label: i18n("nav.rule"), icon: "funnel-outline", iconColor: "#f97316", route: "/pages/rules" },
    { label: i18n("nav.tag"), icon: "pricetag-outline", iconColor: "#14b8a6", route: "/pages/tags" },
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

        {/* Unlock Pro button */}
        <TouchableOpacity
          style={styles.unlockBtn}
          activeOpacity={0.8}
          onPress={() => Alert.alert(i18n("more.comingSoon"))}
        >
          <Ionicons name="lock-open-outline" size={18} color="#ffffff" />
          <Text style={styles.unlockBtnText}>{i18n("more.unlockPro")}</Text>
        </TouchableOpacity>

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: theme.card, borderColor: theme.cardBorder, opacity: 0.5 },
          ]}
        >
          {proItems.map((item, ii) => (
            <View
              key={ii}
              style={[
                styles.menuItem,
                ii < proItems.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.cardBorder,
                },
              ]}
            >
              <View
                style={[styles.iconCircle, { backgroundColor: item.iconColor + "18" }]}
              >
                <Ionicons name={item.icon} size={20} color={item.iconColor} />
              </View>
              <Text style={{ color: theme.text, fontSize: 16, flex: 1 }}>
                {item.label}
              </Text>
              <Ionicons name="lock-closed" size={16} color={theme.textSecondary} />
            </View>
          ))}
        </View>
      </View>
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
    backgroundColor: "#10b981",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  unlockBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
