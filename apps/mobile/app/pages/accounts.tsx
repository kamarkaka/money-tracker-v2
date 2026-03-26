import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createAccountApi, createInstitutionApi } from "@money-tracker/api-client";
import { apiClient } from "@/lib/api";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";
import { SwipeableRow, SwipeableProvider, SwipeableScrollView } from "@/components/SwipeableRow";
import { formatCurrency } from "@money-tracker/shared";
import type { Account, Institution } from "@money-tracker/shared";

const accApi = createAccountApi(apiClient);
const instApi = createInstitutionApi(apiClient);

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit", label: "Credit" },
  { value: "investment", label: "Investment" },
  { value: "loan", label: "Loan" },
];

const TYPE_COLORS: Record<string, string> = {
  checking: "#3b82f6",
  savings: "#059669",
  credit: "#f59e0b",
  investment: "#10b981",
  loan: "#dc2626",
};

export default function AccountsPage() {
  const { theme } = useAppTheme();
  const { i18n } = useI18n();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [institutionName, setInstitutionName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("checking");
  const [balance, setBalance] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await instApi.list();
      setInstitutions(data);
    } catch {
      Alert.alert(i18n("common.error"), "Failed to load accounts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => { setRefreshing(true); loadData(); };

  const resetForm = () => {
    setInstitutionName(""); setAccountName(""); setAccountType("checking"); setBalance("");
    setShowAddForm(false);
  };

  const handleSubmit = async () => {
    if (!accountName.trim()) { Alert.alert(i18n("common.error"), "Account name is required"); return; }
    setSubmitting(true);
    try {
      await accApi.create({
        institutionName: institutionName.trim() || undefined,
        name: accountName.trim(),
        type: accountType,
        balance: balance ? parseFloat(balance) : undefined,
      });
      await loadData();
      resetForm();
    } catch {
      Alert.alert(i18n("common.error"), "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleHidden = (account: Account) => {
    const action = account.isHidden ? i18n("account.unhide") : i18n("account.hide");
    Alert.alert(
      action,
      account.isHidden
        ? `Show "${account.name}" in reports?`
        : `Hide "${account.name}" from reports? Transactions will be excluded from totals.`,
      [
        { text: i18n("common.cancel"), style: "cancel" },
        {
          text: action,
          onPress: async () => {
            try {
              await accApi.update(account.id, { isHidden: !account.isHidden });
              await loadData();
            } catch {
              Alert.alert(i18n("common.error"), "Failed to update account");
            }
          },
        },
      ],
    );
  };

  const handleDeleteInstitution = (institution: Institution) => {
    Alert.alert(
      i18n("account.removeInstitution"),
      i18n("account.removeWarning"),
      [
        { text: i18n("common.cancel"), style: "cancel" },
        {
          text: i18n("common.delete"), style: "destructive",
          onPress: async () => {
            try { await instApi.remove(institution.id); await loadData(); }
            catch { Alert.alert(i18n("common.error"), "Failed to delete institution"); }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = (account: Account) => {
    Alert.alert(
      "Delete Account",
      `Are you sure you want to delete "${account.name}"? All transactions in this account will be deleted.`,
      [
        { text: i18n("common.cancel"), style: "cancel" },
        {
          text: i18n("common.delete"), style: "destructive",
          onPress: async () => {
            try { await accApi.remove(account.id); await loadData(); }
            catch { Alert.alert(i18n("common.error"), "Failed to delete account"); }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <SwipeableProvider>
    <SwipeableScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
    >
      {/* Add Account */}
      <View style={[styles.card, showAddForm ? { backgroundColor: theme.brand + "10", borderColor: theme.brand + "40" } : { backgroundColor: theme.brand, borderColor: theme.brand }]}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => { setShowAddForm(!showAddForm); if (showAddForm) resetForm(); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.cardTitle, { color: showAddForm ? theme.text : theme.brandText, textAlign: "center", flex: 1 }]}>
            {i18n("account.addManual")}
          </Text>
        </TouchableOpacity>

        {showAddForm && (
          <View style={styles.formContent}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{i18n("account.institutionName")}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.text }]}
              value={institutionName}
              onChangeText={setInstitutionName}
              placeholder="e.g., Chase Bank"
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>{i18n("account.accountName")}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.text }]}
              value={accountName}
              onChangeText={setAccountName}
              placeholder="e.g., My Checking"
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>{i18n("account.accountType")}</Text>
            <View style={styles.typeGrid}>
              {ACCOUNT_TYPES.map((type) => {
                const selected = accountType === type.value;
                const color = TYPE_COLORS[type.value] || theme.textSecondary;
                return (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.pill,
                      { borderColor: selected ? color : theme.cardBorder },
                      selected && { backgroundColor: color + "15" },
                    ]}
                    onPress={() => setAccountType(type.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 13, fontWeight: selected ? "600" : "500", color: selected ? color : theme.text }}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>{i18n("account.currentBalance")}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.text }]}
              value={balance}
              onChangeText={setBalance}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.accent, opacity: submitting ? 0.5 : 1 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={theme.accentText} />
              ) : (
                <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: "600" }}>{i18n("common.add")}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Institution List */}
      {institutions.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="business-outline" size={48} color={theme.textSecondary} />
          <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text, marginTop: 16 }}>{i18n("account.noInstitutions")}</Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: "center", marginTop: 8 }}>{i18n("account.noInstitutionsDesc")}</Text>
        </View>
      ) : (
        institutions.map((institution) => (
          <View key={institution.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {/* Institution header — swipe to delete only when no accounts */}
            {institution.accounts.length === 0 ? (
              <SwipeableRow id={institution.id} onDelete={() => handleDeleteInstitution(institution)} dangerColor={theme.danger}>
                <View style={[styles.instHeader, { backgroundColor: theme.card }]}>
                  <Ionicons name="business-outline" size={22} color={theme.accent} />
                  <Text style={[styles.instName, { color: theme.text }]}>{institution.name}</Text>
                </View>
              </SwipeableRow>
            ) : (
              <View style={styles.instHeader}>
                <Ionicons name="business-outline" size={22} color={theme.accent} />
                <Text style={[styles.instName, { color: theme.text }]}>{institution.name}</Text>
              </View>
            )}

            {/* Accounts */}
            {institution.accounts.map((account) => {
              const typeColor = TYPE_COLORS[account.type.toLowerCase()] || theme.textSecondary;
              const bal = typeof account.balance === "string" ? parseFloat(account.balance) : account.balance;
              return (
                <SwipeableRow key={account.id} id={account.id} onDelete={() => handleDeleteAccount(account)} dangerColor={theme.danger}>
                  <View style={[styles.accountRow, { borderTopColor: theme.cardBorder, backgroundColor: theme.card }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.accountName, { color: account.isHidden ? theme.textSecondary : theme.text }]}>{account.name}</Text>
                      <View style={styles.accountMeta}>
                        <View style={[styles.pill, { backgroundColor: typeColor + "15", borderColor: typeColor + "30", paddingVertical: 2, paddingHorizontal: 8 }]}>
                          <Text style={{ fontSize: 11, fontWeight: "600", color: typeColor, textTransform: "capitalize" }}>{account.type}</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: account.isHidden ? theme.textSecondary : theme.text }}>
                          {formatCurrency(bal)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleToggleHidden(account)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={account.isHidden ? "eye-off-outline" : "eye-outline"}
                        size={22}
                        color={account.isHidden ? theme.textSecondary : theme.accent}
                      />
                    </TouchableOpacity>
                  </View>
                </SwipeableRow>
              );
            })}
          </View>
        ))
      )}
    </SwipeableScrollView>
    </SwipeableProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  formContent: { paddingHorizontal: 16, paddingBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  submitBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 40,
    alignItems: "center",
  },
  emptyAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  instHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  instName: { fontSize: 17, fontWeight: "700", flex: 1 },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accountName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  accountMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
