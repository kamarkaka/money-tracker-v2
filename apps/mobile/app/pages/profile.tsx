import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { createProfileApi } from "@money-tracker/api-client";
import { apiClient } from "@/lib/api";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";

interface Profile {
  id: string;
  name?: string | null;
  email: string;
}

export default function ProfilePage() {
  const { theme } = useAppTheme();
  const { i18n } = useI18n();
  const profileApi = createProfileApi(apiClient);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchProfile = useCallback(async () => {
    const data = await profileApi.get();
    setProfile(data as unknown as Profile);
    setName((data as unknown as Profile).name || "");
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    if (name === (profile?.name || "")) {
      setMessage(i18n("common.noChanges"));
      setTimeout(() => setMessage(""), 2000);
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const data = await profileApi.update({ name });
      setProfile(data as unknown as Profile);
      setMessage(i18n("profile.profileUpdated"));
      setTimeout(() => setMessage(""), 2000);
    } catch {
      Alert.alert(i18n("common.error"), i18n("common.error"));
    } finally {
      setSaving(false);
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
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
    >
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
          <Text
            style={{ color: theme.accentText, fontSize: 32, fontWeight: "700" }}
          >
            {(profile?.name || "U").charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* User info card */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.cardBorder },
        ]}
      >
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          {i18n("profile.userInfo")}
        </Text>

        {message ? (
          <View style={[styles.messageBanner, { backgroundColor: theme.successBg }]}>
            <Text style={{ color: theme.successText, fontSize: 13 }}>{message}</Text>
          </View>
        ) : null}

        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {i18n("common.name")}
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBg,
              color: theme.text,
              borderColor: theme.cardBorder,
            },
          ]}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={theme.textSecondary}
        />

        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {i18n("profile.storageMode")}
        </Text>
        <View style={styles.providerRow}>
          <Text style={{ color: theme.text, fontSize: 14 }}>
            {i18n("profile.localDevice")}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: theme.accent, opacity: saving ? 0.6 : 1 },
          ]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text
            style={{ color: theme.accentText, fontSize: 15, fontWeight: "600" }}
          >
            {saving ? i18n("common.saving") : i18n("common.saveChanges")}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 40 },
  avatarSection: { alignItems: "center", marginBottom: 20 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  messageBanner: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  saveBtn: {
    height: 46,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
});
