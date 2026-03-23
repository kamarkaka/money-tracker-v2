import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Alert,
} from "react-native";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

interface MenuItem {
  label: string;
  icon: string;
  onPress: () => void;
  color?: string;
}

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  const scheme = useColorScheme();
  const theme = colors[scheme === "dark" ? "dark" : "light"];

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: "Account",
      items: [
        { label: "Profile", icon: "\u{1F464}", onPress: () => {} },
        { label: "Settings", icon: "\u{2699}\u{FE0F}", onPress: () => {} },
      ],
    },
    {
      title: "Finance",
      items: [
        { label: "Accounts", icon: "\u{1F3E6}", onPress: () => {} },
        { label: "Categories", icon: "\u{1F516}", onPress: () => {} },
        { label: "Budgets", icon: "\u{1F4B0}", onPress: () => {} },
        { label: "Rules", icon: "\u{1F50D}", onPress: () => {} },
        { label: "Tags", icon: "\u{1F3F7}\u{FE0F}", onPress: () => {} },
      ],
    },
    {
      title: "",
      items: [
        { label: "Sign Out", icon: "\u{1F6AA}", onPress: handleSignOut, color: "#ef4444" },
      ],
    },
  ];

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      {/* User info */}
      <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
          <Text style={{ color: theme.accentText, fontSize: 22, fontWeight: "700" }}>
            {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          {user?.name && <Text style={{ color: theme.text, fontSize: 17, fontWeight: "600" }}>{user.name}</Text>}
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{user?.email}</Text>
        </View>
      </View>

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
                onPress={item.onPress}
                activeOpacity={0.6}
              >
                <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                <Text style={{ color: item.color || theme.text, fontSize: 16, flex: 1 }}>{item.label}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 18 }}>{">"}</Text>
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
});
