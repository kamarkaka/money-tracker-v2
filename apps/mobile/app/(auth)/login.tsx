import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { theme } = useAppTheme();
  const { i18n } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Login failed";
      Alert.alert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert("Google Sign In", "Google sign-in will be available soon.");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <Image
            source={require("@/assets/logo.png")}
            style={styles.logo}
          />
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]}>Money Tracker 2</Text>
            <View style={styles.betaBadge}>
              <Text style={styles.betaText}>BETA</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {i18n("auth.tagline")}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={[styles.inputRow, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
            <Ionicons name="mail-outline" size={18} color={theme.textSecondary} />
            <TextInput
              style={[styles.inputText, { color: theme.text }]}
              placeholder={i18n("common.email")}
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={[styles.inputRow, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
            <Ionicons name="lock-closed-outline" size={18} color={theme.textSecondary} />
            <TextInput
              style={[styles.inputText, { color: theme.text }]}
              placeholder={i18n("common.password")}
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent, opacity: loading ? 0.6 : 1 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: theme.accentText }]}>
              {loading ? i18n("common.loading") : i18n("auth.login")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Or divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
          <Text style={[styles.dividerText, { color: theme.textSecondary }]}>{i18n("auth.or")}</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
        </View>

        {/* Google sign in */}
        <TouchableOpacity
          style={[styles.googleButton, { borderColor: theme.cardBorder, backgroundColor: theme.inputBg }]}
          onPress={handleGoogleLogin}
          activeOpacity={0.7}
        >
          <GoogleIcon />
          <Text style={{ color: theme.text, fontSize: 15, fontWeight: "500" }}>{i18n("auth.signInWithGoogle")}</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{i18n("auth.noAccount")} </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={{ color: theme.accent, fontWeight: "600", fontSize: 14 }}>{i18n("auth.register")}</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function GoogleIcon() {
  return (
    <View style={{ width: 20, height: 20 }}>
      <Text style={{ fontSize: 18, lineHeight: 22 }}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
  logoSection: { alignItems: "center", marginBottom: 32 },
  logo: { width: 80, height: 80, borderRadius: 16 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 16 },
  title: { fontSize: 28, fontWeight: "800" },
  betaBadge: {
    borderWidth: 1,
    borderColor: "#dc2626",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
    marginTop: -2,
  },
  betaText: { fontSize: 9, fontWeight: "700", color: "#dc2626" },
  subtitle: { fontSize: 14, marginTop: 4 },
  form: { gap: 14 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  inputText: { flex: 1, fontSize: 16, height: "100%" },
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: { fontSize: 16, fontWeight: "700" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { paddingHorizontal: 12, fontSize: 12 },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    gap: 10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
});
