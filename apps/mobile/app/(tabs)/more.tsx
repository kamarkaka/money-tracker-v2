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
import { useAuth } from "@/lib/auth";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";

interface MenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  route?: string;
  onPress?: () => void;
  textColor?: string;
}

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  const { theme } = useAppTheme();
  const { i18n } = useI18n();
  const router = useRouter();

  const handleSignOut = () => {
    Alert.alert(i18n("auth.logout"), i18n("common.continue") + "?", [
      { text: i18n("common.cancel"), style: "cancel" },
      { text: i18n("auth.logout"), style: "destructive", onPress: signOut },
    ]);
  };

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: i18n("nav.setting"),
      items: [
        { label: i18n("nav.setting"), icon: "settings-outline", iconColor: "#71717a", route: "/pages/settings" },
      ],
    },
    {
      title: "",
      items: [
        { label: i18n("nav.account"), icon: "business-outline", iconColor: "#3b82f6", route: "/pages/accounts" },
        { label: i18n("nav.transaction"), icon: "list-outline", iconColor: "#f59e0b", route: "/pages/transactions" },
        { label: i18n("nav.category"), icon: "bookmark-outline", iconColor: "#8b5cf6", route: "/pages/categories" },
        { label: i18n("nav.budget"), icon: "wallet-outline", iconColor: "#10b981", route: "/pages/budgets" },
        { label: i18n("nav.rule"), icon: "funnel-outline", iconColor: "#f97316", route: "/pages/rules" },
        { label: i18n("nav.tag"), icon: "pricetag-outline", iconColor: "#14b8a6", route: "/pages/tags" },
      ],
    },
    {
      title: "",
      items: [
        { label: i18n("auth.logout"), icon: "log-out-outline", iconColor: "#ef4444", textColor: "#ef4444", onPress: handleSignOut },
      ],
    },
  ];

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      {/* User info — taps to profile */}
      <TouchableOpacity
        style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        onPress={() => router.push("/pages/profile" as any)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
          <Text style={{ color: theme.accentText, fontSize: 22, fontWeight: "700" }}>
            {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          {user?.name && <Text style={{ color: theme.text, fontSize: 17, fontWeight: "600" }}>{user.name}</Text>}
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{user?.email}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      </TouchableOpacity>

      {sections.map((section, si) => (
        <View key={si} style={styles.section}>
          {section.title ? (
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{section.title}</Text>
          ) : null}
          <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {section.items.map((item, ii) => (
              <TouchableOpacity
                key={ii}
                style={[
                  styles.menuItem,
                  ii < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.cardBorder },
                ]}
                onPress={() => {
                  if (item.onPress) item.onPress();
                  else if (item.route) router.push(item.route as any);
                }}
                activeOpacity={0.6}
              >
                <View style={[styles.iconCircle, { backgroundColor: item.iconColor + "18" }]}>
                  <Ionicons name={item.icon} size={20} color={item.iconColor} />
                </View>
                <Text style={{ color: item.textColor || theme.text, fontSize: 16, flex: 1 }}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", marginBottom: 8, marginLeft: 4 },
  sectionCard: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
