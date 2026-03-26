import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
let DraggableFlatList: any = null;
try {
  DraggableFlatList = require("react-native-draggable-flatlist").default;
} catch {
  // Not available (Expo Go)
}
import { createSettingsApi } from "@money-tracker/api-client";
import { apiClient } from "@/lib/api";
import { useAppTheme, type ThemeSetting } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";
import { exportToFile, pickAndImport } from "@/lib/db";
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
  { value: "system", icon: "phone-portrait-outline", labelKey: "setting.system" },
  { value: "light", icon: "sunny-outline", labelKey: "setting.light" },
  { value: "dark", icon: "moon-outline", labelKey: "setting.dark" },
];

const LANGUAGE_OPTIONS = [
  { code: "auto", labelKey: "setting.system" },
  { code: "en", native: "English" },
  { code: "zh", native: "简体中文" },
];

export default function SettingsPage() {
  const { theme, themeSetting, setThemeSetting, isPro: isProTheme, tabConfig, setTabConfig, fireworksEnabled, setFireworksEnabled } = useAppTheme();
  const { i18n, locale, setLocale } = useI18n();
  const api = useRef(createSettingsApi(apiClient)).current;

  const [loading, setLoading] = useState(true);
  const [langSetting, setLangSetting] = useState("auto");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const { restore } = useSubscription();

  useEffect(() => {
    api.get().then((s) => {
      if (s.language) setLangSetting(s.language === "auto" ? "auto" : s.language);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleThemeChange = (value: ThemeSetting) => {
    setThemeSetting(value);
  };

  const handleLangChange = (code: string) => {
    if (code === "auto") {
      // Save "auto" to DB, but resolve to system language for display
      const { getLocales } = require("expo-localization");
      const systemLang = getLocales()[0]?.languageCode || "en";
      const resolved = systemLang === "zh" ? "zh" : "en";
      setLocale(resolved);
      // Save "auto" to DB so it persists
      const settingsApi = createSettingsApi(apiClient);
      settingsApi.update({ language: "auto" });
    } else {
      setLocale(code);
    }
    setLangSetting(code);
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
                  { borderColor: selected ? theme.brand : theme.cardBorder },
                  selected && { backgroundColor: theme.brand + "15" },
                ]}
                onPress={() => handleThemeChange(opt.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={opt.icon}
                  size={24}
                  color={selected ? theme.brand : theme.textSecondary}
                />
                <Text style={{
                  fontSize: 14,
                  fontWeight: selected ? "700" : "500",
                  color: selected ? theme.brand : theme.text,
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
            const selected = langSetting === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langCard,
                  { borderColor: selected ? theme.brand : theme.cardBorder },
                  selected && { backgroundColor: theme.brand + "15" },
                ]}
                onPress={() => handleLangChange(lang.code)}
                activeOpacity={0.7}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: selected ? "700" : "500",
                  color: selected ? theme.brand : theme.text,
                }}>
                  {"labelKey" in lang ? i18n(lang.labelKey as string) : lang.native}
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
          {DraggableFlatList ? (
            <DraggableFlatList
              data={tabConfig.map((v: string) => TAB_OPTIONS.find((t) => t.value === v)!).filter(Boolean)}
              keyExtractor={(item: any) => item.value}
              scrollEnabled={false}
              containerStyle={{ marginBottom: 4 }}
              onDragEnd={({ data }: any) => setTabConfig(data.map((d: any) => d.value))}
              renderItem={({ item, drag, isActive }: any) => (
                <TouchableOpacity
                  onLongPress={drag}
                  delayLongPress={150}
                  activeOpacity={1}
                  style={[
                    styles.dragItem,
                    {
                      opacity: 1,
                      backgroundColor: theme.card,
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
                      setTabConfig(tabConfig.filter((t: string) => t !== item.value));
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          ) : (
            tabConfig.map((value: string) => {
              const tab = TAB_OPTIONS.find((t) => t.value === value);
              if (!tab) return null;
              return (
                <View key={value} style={[styles.dragItem, { borderColor: theme.accent + "60" }]}>
                  <Ionicons name={tab.icon} size={20} color={theme.accent} />
                  <Text style={{ fontSize: 15, fontWeight: "600", color: theme.accent, flex: 1 }}>
                    {i18n(tab.labelKey)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (tabConfig.length <= 1) return;
                      setTabConfig(tabConfig.filter((t: string) => t !== value));
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}

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

      {/* Fireworks — Pro only */}
      {isProTheme && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.fireworksRow}>
            <Ionicons name="sparkles-outline" size={22} color={fireworksEnabled ? theme.brand : theme.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: theme.text }}>{i18n("setting.fireworks")}</Text>
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>{i18n("setting.fireworksDesc")}</Text>
            </View>
            <Switch
              value={fireworksEnabled}
              onValueChange={setFireworksEnabled}
              trackColor={{ false: theme.cardBorder, true: theme.brand }}
            />
          </View>
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
  fireworksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
