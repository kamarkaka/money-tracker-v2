import { useState, useEffect, useRef } from "react";
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
import type { Account, Institution } from "@money-tracker/shared";
import { MENU_COLORS } from "@/lib/colors";

const accApi = createAccountApi(apiClient);
const instApi = createInstitutionApi(apiClient);

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit", label: "Credit" },
  { value: "investment", label: "Investment" },
  { value: "loan", label: "Loan" },
];

export default function AccountsPage() {
  const { theme } = useAppTheme();
  const { i18n } = useI18n();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [institutionName, setInstitutionName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("checking");
  const [balance, setBalance] = useState("");

  const loadData = async () => {
    try {
      const data = await instApi.list();
      setInstitutions(data);
    } catch (e) {
      Alert.alert(i18n("common.error"), "Failed to load accounts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const resetForm = () => {
    setInstitutionName("");
    setAccountName("");
    setAccountType("checking");
    setBalance("");
    setShowAddForm(false);
  };

  const handleSubmit = async () => {
    if (!accountName.trim()) {
      Alert.alert(i18n("common.error"), "Account name is required");
      return;
    }

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
    } catch (e) {
      Alert.alert(i18n("common.error"), "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleHidden = async (account: Account) => {
    try {
      await accApi.update(account.id, { isHidden: !account.isHidden });
      await loadData();
    } catch (e) {
      Alert.alert(i18n("common.error"), "Failed to update account");
    }
  };

  const handleDeleteInstitution = (institution: Institution) => {
    Alert.alert(
      "Delete Institution",
      `Are you sure you want to delete "${institution.name}" and all its accounts?`,
      [
        { text: i18n("common.cancel"), style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await instApi.remove(institution.id);
              await loadData();
            } catch (e) {
              Alert.alert(i18n("common.error"), "Failed to delete institution");
            }
          },
        },
      ],
    );
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "checking":
        return MENU_COLORS.accounts;
      case "savings":
        return theme.income;
      case "credit":
        return MENU_COLORS.transactions;
      case "investment":
        return MENU_COLORS.budgets;
      case "loan":
        return theme.expense;
      default:
        return theme.textSecondary;
    }
  };

  const formatBalance = (balance: string | number) => {
    const num = typeof balance === "string" ? parseFloat(balance) : balance;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.accent}
        />
      }
    >
      {/* Add Account Button */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.brand, borderColor: theme.cardBorder }]}
        onPress={() => setShowAddForm(!showAddForm)}
        activeOpacity={0.7}
      >
        <Ionicons name={showAddForm ? "close" : "add"} size={20} color={theme.brandText} />
        <Text style={[styles.addButtonText, { color: theme.brandText }]}>
          {showAddForm ? "Cancel" : "Add Account"}
        </Text>
      </TouchableOpacity>

      {/* Add Account Form */}
      {showAddForm && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.formLabel, { color: theme.text }]}>Institution Name (Optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.text }]}
            value={institutionName}
            onChangeText={setInstitutionName}
            placeholder="e.g., Chase Bank"
            placeholderTextColor={theme.textSecondary}
          />

          <Text style={[styles.formLabel, { color: theme.text }]}>Account Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.text }]}
            value={accountName}
            onChangeText={setAccountName}
            placeholder="e.g., My Checking"
            placeholderTextColor={theme.textSecondary}
          />

          <Text style={[styles.formLabel, { color: theme.text }]}>Account Type</Text>
          <View style={styles.typeGrid}>
            {ACCOUNT_TYPES.map((type) => {
              const selected = accountType === type.value;
              return (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeOption,
                    { borderColor: selected ? theme.accent : theme.cardBorder },
                    selected && { backgroundColor: theme.accent + "15" },
                  ]}
                  onPress={() => setAccountType(type.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: selected ? "600" : "500",
                      color: selected ? theme.accent : theme.text,
                    }}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.formLabel, { color: theme.text }]}>Initial Balance (Optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.text }]}
            value={balance}
            onChangeText={setBalance}
            placeholder="0.00"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
          />

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.brand }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={theme.brandText} />
            ) : (
              <Text style={[styles.submitButtonText, { color: theme.brandText }]}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Institutions & Accounts List */}
      {institutions.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="wallet-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No accounts yet. Add your first account to get started.
          </Text>
        </View>
      ) : (
        institutions.map((institution) => (
          <View
            key={institution.id}
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            {/* Institution Header */}
            <View style={styles.institutionHeader}>
              <View style={styles.institutionInfo}>
                <Ionicons name="business-outline" size={20} color={MENU_COLORS.accounts} />
                <Text style={[styles.institutionName, { color: theme.text }]}>{institution.name}</Text>
                {institution.isManual && (
                  <View style={[styles.manualBadge, { backgroundColor: theme.textSecondary + "20" }]}>
                    <Text style={[styles.manualBadgeText, { color: theme.textSecondary }]}>Manual</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteInstitution(institution)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color={theme.danger} />
              </TouchableOpacity>
            </View>

            {/* Accounts */}
            {institution.accounts.map((account, index) => (
              <View
                key={account.id}
                style={[
                  styles.accountRow,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.cardBorder },
                ]}
              >
                <View style={styles.accountInfo}>
                  <Text style={[styles.accountName, { color: theme.text }]}>{account.name}</Text>
                  <View style={styles.accountMeta}>
                    <View style={[styles.typeBadge, { backgroundColor: getTypeBadgeColor(account.type) + "20" }]}>
                      <Text style={[styles.typeBadgeText, { color: getTypeBadgeColor(account.type) }]}>
                        {account.type}
                      </Text>
                    </View>
                    <Text style={[styles.accountBalance, { color: theme.text }]}>
                      {formatBalance(account.balance)}
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
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 40 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeOption: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  institutionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  institutionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  institutionName: {
    fontSize: 17,
    fontWeight: "700",
  },
  manualBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  manualBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },
  accountMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  typeBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  accountBalance: {
    fontSize: 14,
    fontWeight: "600",
  },
});
