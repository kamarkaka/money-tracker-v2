import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createSettingsApi } from "@money-tracker/api-client";
import { apiClient } from "@/lib/api";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";

type ThemeSetting = "light" | "dark" | "system";

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
  const { theme, themeSetting, setThemeSetting } = useAppTheme();
  const { i18n, locale, setLocale } = useI18n();
  const api = useRef(createSettingsApi(apiClient)).current;

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get().then(() => {
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleThemeChange = (value: ThemeSetting) => {
    setThemeSetting(value);
  };

  const handleLangChange = (code: string) => {
    setLocale(code); // Updates i18n context + saves to API
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
  langGrid: { flexDirection: "row", gap: 10 },
  langCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
});
