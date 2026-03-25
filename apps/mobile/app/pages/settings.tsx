import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { createSettingsApi } from "@money-tracker/api-client";
import { apiClient } from "@/lib/api";
import { useAppTheme, type ThemeSetting } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";
import { exportToFile, pickAndImport, getDatabase, uuid } from "@/lib/db";
import { MENU_COLORS } from "@/lib/colors";
import { useSubscription } from "@/lib/subscription";

const TAB_OPTIONS: { value: string; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { value: "overview", icon: "pie-chart-outline", labelKey: "nav.overview" },
  { value: "accounts", icon: "business-outline", labelKey: "nav.account" },
  { value: "transactions", icon: "list-outline", labelKey: "nav.transaction" },
  { value: "budgets", icon: "wallet-outline", labelKey: "nav.budget" },
  { value: "categories", icon: "bookmark-outline", labelKey: "nav.category" },
  { value: "rules", icon: "funnel-outline", labelKey: "nav.rule" },
  { value: "tags", icon: "pricetag-outline", labelKey: "nav.tag" },
];

const THEME_OPTIONS: { value: ThemeSetting; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { value: "light", icon: "sunny-outline", labelKey: "setting.light" },
  { value: "dark", icon: "moon-outline", labelKey: "setting.dark" },
  { value: "system", icon: "phone-portrait-outline", labelKey: "setting.system" },
];

const LANGUAGE_OPTIONS = [
  { code: "en", native: "English" },
  { code: "zh", native: "简体中文" },
];

export default function SettingsPage() {
  const { theme, themeSetting, setThemeSetting, isPro: isProTheme, devMode, tabConfig, setTabConfig, setDevMode, setDevIsPro } = useAppTheme();
  const { i18n, locale, setLocale } = useI18n();
  const api = useRef(createSettingsApi(apiClient)).current;

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { restore } = useSubscription();

  const persistIsPro = async (value: boolean) => {
    try {
      const db = await getDatabase();
      await db.runAsync("UPDATE settings SET mode = ? WHERE id = 'default'", [value ? "pro" : "casual"]);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    api.get().then(() => {
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleThemeChange = (value: ThemeSetting) => {
    setThemeSetting(value);
  };

  const handleLangChange = (code: string) => {
    setLocale(code);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToFile();
    } catch (e) {
      Alert.alert(
        i18n("common.error"),
        e instanceof Error ? e.message : "Export failed",
      );
    } finally {
      setExporting(false);
    }
  };

  const handleImport = () => {
    Alert.alert(
      i18n("data.importData"),
      i18n("data.importWarning"),
      [
        { text: i18n("common.cancel"), style: "cancel" },
        {
          text: i18n("data.importData"),
          style: "destructive",
          onPress: async () => {
            setImporting(true);
            try {
              const result = await pickAndImport();
              Alert.alert(
                result.success ? i18n("common.success") : i18n("common.error"),
                result.message,
              );
            } catch (e) {
              Alert.alert(
                i18n("common.error"),
                e instanceof Error ? e.message : "Import failed",
              );
            } finally {
              setImporting(false);
            }
          },
        },
      ],
    );
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const db = await getDatabase();
      const accounts = await db.getAllAsync<{ id: string }>("SELECT id FROM accounts");
      const categories = await db.getAllAsync<{ id: string }>("SELECT id FROM categories");

      if (accounts.length === 0 || categories.length === 0) {
        Alert.alert(i18n("common.error"), "Please create at least one account and category first.");
        setSeeding(false);
        return;
      }

      const descriptions = [
        "Grocery Store", "Coffee Shop", "Gas Station", "Restaurant", "Uber Ride",
        "Netflix", "Spotify", "Amazon Purchase", "Electric Bill", "Water Bill",
        "Gym Membership", "Doctor Visit", "Pharmacy", "Pet Food", "Daycare",
        "Haircut", "Birthday Gift", "Flight Ticket", "Hotel Stay", "Parking",
        "Lunch", "Dinner", "Breakfast", "Snacks", "Internet Bill",
        "Phone Bill", "Insurance", "Rent Payment", "Car Payment", "Loan Payment",
        "Salary", "Freelance Income", "Refund", "Bonus", "Interest",
      ];

      const now = new Date();
      for (let i = 0; i < 100; i++) {
        const acct = accounts[i % accounts.length];
        const cat = categories[i % categories.length];
        const desc = descriptions[i % descriptions.length];
        const isIncome = desc === "Salary" || desc === "Freelance Income" || desc === "Refund" || desc === "Bonus" || desc === "Interest";
        const amount = isIncome
          ? (Math.floor(Math.random() * 500000) + 50000) / 100
          : -(Math.floor(Math.random() * 30000) + 100) / 100;
        const daysAgo = Math.floor(Math.random() * 180);
        const date = new Date(now.getTime() - daysAgo * 86400000);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

        await db.runAsync(
          "INSERT INTO transactions (id, account_id, category_id, description, amount, date, is_manual) VALUES (?, ?, ?, ?, ?, ?, 1)",
          [uuid(), acct.id, cat.id, desc, amount, dateStr],
        );
      }

      Alert.alert(i18n("common.success"), "Generated 100 random transactions across all accounts and categories.");
    } catch (e) {
      Alert.alert(i18n("common.error"), e instanceof Error ? e.message : "Failed to generate data");
    } finally {
      setSeeding(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restore();
      Alert.alert(
        restored ? i18n("common.success") : i18n("paywall.restoreFailed"),
        restored ? i18n("paywall.restoreSuccess") : i18n("paywall.noSubscription"),
      );
    } catch {
      Alert.alert(i18n("common.error"), i18n("common.error"));
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      {/* Appearance */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{i18n("setting.appearance")}</Text>
        <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{i18n("setting.appearanceDesc")}</Text>

        <View style={styles.optionGrid}>
          {THEME_OPTIONS.map((opt) => {
            const selected = themeSetting === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionCard,
                  { borderColor: selected ? theme.accent : theme.cardBorder },
                  selected && { backgroundColor: theme.accent + "15" },
                ]}
                onPress={() => handleThemeChange(opt.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={opt.icon}
                  size={24}
                  color={selected ? theme.accent : theme.textSecondary}
                />
                <Text style={{
                  fontSize: 14,
                  fontWeight: selected ? "700" : "500",
                  color: selected ? theme.accent : theme.text,
                  marginTop: 6,
                }}>
                  {i18n(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Language */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{i18n("setting.language")}</Text>
        <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{i18n("setting.languageDesc")}</Text>

        <View style={styles.langGrid}>
          {LANGUAGE_OPTIONS.map((lang) => {
            const selected = locale === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langCard,
                  { borderColor: selected ? theme.accent : theme.cardBorder },
                  selected && { backgroundColor: theme.accent + "15" },
                ]}
                onPress={() => handleLangChange(lang.code)}
                activeOpacity={0.7}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: selected ? "700" : "500",
                  color: selected ? theme.accent : theme.text,
                }}>
                  {lang.native}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Bottom Bar — Pro only */}
      {isProTheme && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{i18n("setting.bottomBar")}</Text>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{i18n("setting.bottomBarDesc")}</Text>

          {/* Selected tabs — drag to reorder */}
          <Text style={[styles.tabSectionLabel, { color: theme.textSecondary }]}>
            {i18n("setting.selectedTabs")}
          </Text>
          <DraggableFlatList
            data={tabConfig.map((v) => TAB_OPTIONS.find((t) => t.value === v)!).filter(Boolean)}
            keyExtractor={(item) => item.value}
            scrollEnabled={false}
            containerStyle={{ marginBottom: 4 }}
            onDragEnd={({ data }) => setTabConfig(data.map((d) => d.value))}
            renderItem={({ item, drag, isActive }: RenderItemParams<typeof TAB_OPTIONS[number]>) => (
              <TouchableOpacity
                onLongPress={drag}
                delayLongPress={150}
                activeOpacity={1}
                style={[
                  styles.dragItem,
                  {
                    opacity: 1,
                    backgroundColor: isActive ? theme.card : theme.card,
                    elevation: isActive ? 5 : 0,
                    shadowColor: isActive ? theme.shadow : "transparent",
                    shadowOpacity: isActive ? 0.15 : 0,
                    shadowRadius: isActive ? 8 : 0,
                    shadowOffset: { width: 0, height: isActive ? 2 : 0 },
                    borderColor: isActive ? theme.accent : theme.accent + "60",
                  },
                ]}
              >
                <Ionicons name="reorder-three" size={24} color={theme.textSecondary} />
                <Ionicons name={item.icon} size={20} color={theme.accent} />
                <Text style={{ fontSize: 15, fontWeight: "600", color: theme.accent, flex: 1 }}>
                  {i18n(item.labelKey)}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (tabConfig.length <= 1) return;
                    setTabConfig(tabConfig.filter((t) => t !== item.value));
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />

          {/* Available tabs */}
          {tabConfig.length < 4 && (
            <>
              <Text style={[styles.tabSectionLabel, { color: theme.textSecondary, marginTop: 16 }]}>
                {i18n("setting.availableTabs")}
              </Text>
              {TAB_OPTIONS.filter((t) => !tabConfig.includes(t.value)).map((tab) => (
                <TouchableOpacity
                  key={tab.value}
                  style={[styles.availableItem, { borderColor: theme.cardBorder }]}
                  onPress={() => setTabConfig([...tabConfig, tab.value])}
                  activeOpacity={0.7}
                >
                  <Ionicons name={tab.icon} size={20} color={theme.textSecondary} />
                  <Text style={{ fontSize: 15, fontWeight: "500", color: theme.text, flex: 1 }}>
                    {i18n(tab.labelKey)}
                  </Text>
                  <Ionicons name="add-circle-outline" size={22} color={theme.brand} />
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      )}

      {/* Data */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{i18n("data.dataManagement")}</Text>
        <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{i18n("data.dataManagementDesc")}</Text>

        <TouchableOpacity
          style={[styles.dataBtn, { borderColor: theme.cardBorder }]}
          onPress={handleExport}
          disabled={exporting || importing}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={20} color={MENU_COLORS.export} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: theme.text, flex: 1 }}>
            {i18n("data.exportData")}
          </Text>
          {exporting ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dataBtn, { borderColor: theme.cardBorder }]}
          onPress={handleImport}
          disabled={exporting || importing}
          activeOpacity={0.7}
        >
          <Ionicons name="download-outline" size={20} color={MENU_COLORS.import} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: theme.text, flex: 1 }}>
            {i18n("data.importData")}
          </Text>
          {importing ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dataBtn, { borderColor: theme.cardBorder }]}
          onPress={handleRestore}
          disabled={restoring}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={20} color={theme.brand} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: theme.text, flex: 1 }}>
            {i18n("paywall.restore")}
          </Text>
          {restoring ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      {/* DEV Tools */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.dangerBg }]}>
        <Text style={[styles.cardTitle, { color: theme.danger }]}>Dev Tools</Text>
        <TouchableOpacity
          style={[styles.dataBtn, { borderColor: theme.cardBorder }]}
          onPress={handleSeedData}
          disabled={seeding}
          activeOpacity={0.7}
        >
          <Ionicons name="flask-outline" size={20} color={theme.danger} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: theme.text, flex: 1 }}>
            Generate 100 Transactions
          </Text>
          {seeding ? (
            <ActivityIndicator size="small" color={theme.danger} />
          ) : (
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          )}
        </TouchableOpacity>

        {/* Dev Mode Toggle */}
        <TouchableOpacity
          style={[styles.dataBtn, { borderColor: theme.cardBorder }]}
          onPress={() => setDevMode(!devMode)}
          activeOpacity={0.7}
        >
          <Ionicons name={devMode ? "toggle" : "toggle-outline"} size={22} color={devMode ? theme.brand : theme.textSecondary} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: theme.text, flex: 1 }}>
            Dev Mode
          </Text>
          <View style={[styles.devBadge, { backgroundColor: devMode ? theme.brand + "20" : theme.cardBorder + "40" }]}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: devMode ? theme.brand : theme.textSecondary }}>
              {devMode ? "ON" : "OFF"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Pro/Free Switch — only when dev mode is on */}
        {devMode && (
          <TouchableOpacity
            style={[styles.dataBtn, { borderColor: theme.cardBorder }]}
            onPress={() => {
              const newValue = !isProTheme;
              setDevIsPro(newValue);
              persistIsPro(newValue);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name={isProTheme ? "star" : "star-outline"} size={20} color={isProTheme ? theme.brand : theme.danger} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: theme.text, flex: 1 }}>
              {isProTheme ? "Switch to Free" : "Switch to Pro"}
            </Text>
            <View style={[styles.devBadge, { backgroundColor: isProTheme ? theme.brand + "20" : theme.danger + "20" }]}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: isProTheme ? theme.brand : theme.danger }}>
                {isProTheme ? "PRO" : "FREE"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  cardDesc: { fontSize: 13, marginTop: 2, marginBottom: 16 },
  optionGrid: { flexDirection: "row", gap: 10 },
  optionCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  tabSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  dragItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  availableItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
    borderStyle: "dashed",
  },
  devBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  langGrid: { flexDirection: "row", gap: 10 },
  langCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  dataBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
