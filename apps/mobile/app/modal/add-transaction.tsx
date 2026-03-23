import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { createTransactionApi, createAccountApi, createCategoryApi } from "@money-tracker/api-client";
import type { Account, Category } from "@money-tracker/shared";
import { DEFAULT_EMOJIS } from "@money-tracker/shared";
import { apiClient } from "@/lib/api";
import { colors } from "@/lib/theme";

export default function AddTransactionModal() {
  const scheme = useColorScheme();
  const theme = colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();
  const txApi = createTransactionApi(apiClient);
  const accApi = createAccountApi(apiClient);
  const catApi = createCategoryApi(apiClient);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isExpense, setIsExpense] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([accApi.list(), catApi.list()]).then(([accs, cats]) => {
      setAccounts(accs);
      setCategories(cats);
      if (accs.length > 0) setAccountId(accs[0].id);
    });
  }, []);

  const handleSave = async () => {
    if (!accountId) { Alert.alert("Error", "Please select an account"); return; }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { Alert.alert("Error", "Please enter a valid amount"); return; }

    setSaving(true);
    try {
      await txApi.create({
        accountId,
        description: description.trim() || (selectedEmoji ? "" : "Transaction"),
        amount: isExpense ? -parsed : parsed,
        date,
        emoji: selectedEmoji || undefined,
      });
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: theme.accent, fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Add Transaction</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={{ color: theme.accent, fontSize: 16, fontWeight: "600", opacity: saving ? 0.5 : 1 }}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, isExpense && { backgroundColor: "#fee2e2" }]}
              onPress={() => setIsExpense(true)}
            >
              <Text style={{ color: isExpense ? "#dc2626" : theme.textSecondary, fontWeight: "600" }}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !isExpense && { backgroundColor: "#dcfce7" }]}
              onPress={() => setIsExpense(false)}
            >
              <Text style={{ color: !isExpense ? "#16a34a" : theme.textSecondary, fontWeight: "600" }}>Income</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.amountInput, { color: isExpense ? theme.expense : theme.income }]}
            placeholder="0.00"
            placeholderTextColor={theme.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        {/* Emoji Category */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
          {DEFAULT_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={[
                styles.emojiBtn,
                { borderColor: selectedEmoji === emoji ? theme.accent : theme.cardBorder },
                selectedEmoji === emoji && { backgroundColor: theme.accent + "20" },
              ]}
              onPress={() => setSelectedEmoji(selectedEmoji === emoji ? null : emoji)}
            >
              <Text style={{ fontSize: 24 }}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Description */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>Description</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.cardBorder }]}
          placeholder="What was this for?"
          placeholderTextColor={theme.textSecondary}
          value={description}
          onChangeText={setDescription}
        />

        {/* Account selector */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>Account</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              style={[
                styles.chipBtn,
                {
                  borderColor: accountId === acc.id ? theme.accent : theme.cardBorder,
                  backgroundColor: accountId === acc.id ? theme.accent + "20" : theme.card,
                },
              ]}
              onPress={() => setAccountId(acc.id)}
            >
              <Text style={{ color: accountId === acc.id ? theme.accent : theme.text, fontSize: 14 }}>
                {acc.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Date */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>Date</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.cardBorder }]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.textSecondary}
          value={date}
          onChangeText={setDate}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingTop: 8 },
  title: { fontSize: 18, fontWeight: "700" },
  amountSection: { alignItems: "center", marginBottom: 24 },
  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  amountInput: { fontSize: 48, fontWeight: "800", textAlign: "center", width: "100%" },
  label: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", marginBottom: 8, marginLeft: 4 },
  emojiRow: { marginBottom: 20 },
  emojiBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 1.5, justifyContent: "center", alignItems: "center", marginRight: 8 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, marginBottom: 16 },
  chipBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
});
