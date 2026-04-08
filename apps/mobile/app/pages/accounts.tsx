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
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createAccountApi, createInstitutionApi } from "@money-tracker/api-client";
import { apiClient } from "@/lib/api";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";
import { SwipeableRow, SwipeableProvider, SwipeableScrollView } from "@/components/SwipeableRow";
import { PlaidLinkButton } from "@/components/PlaidLink";
import { formatCurrency } from "@money-tracker/shared";
import type { Account, Institution } from "@money-tracker/shared";
import { getDatabase } from "@/lib/db";
import { refreshPlaidItem, unlinkPlaidItem } from "@/lib/plaid/sync";

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

type InstitutionWithPlaid = Institution & {
  plaidItemId?: string | null;
  updatedAt?: string | null;
};

export default function AccountsPage() {
  const { theme } = useAppTheme();
  const { i18n } = useI18n();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [institutions, setInstitutions] = useState<InstitutionWithPlaid[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [institutionName, setInstitutionName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("checking");
  const [balance, setBalance] = useState("");
  const [refreshingInstId, setRefreshingInstId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = (message: string, isError: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, isError });
    toastOpacity.setValue(1);
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast(null));
    }, 1000);
  };

  useEffect(() => {
    loadData();
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

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

  const handleRefreshInstitution = async (institution: InstitutionWithPlaid) => {
    setRefreshingInstId(institution.id);
    try {
      const db = await getDatabase();
      const result = await refreshPlaidItem(db, institution.id);
      await loadData();
      if (result) {
        const parts: string[] = [];
        if (result.added > 0) parts.push(`${result.added} added`);
        if (result.updated > 0) parts.push(`${result.updated} updated`);
        if (parts.length > 0) {
          showToast(parts.join(", "), false);
        } else {
          const total = await db.getFirstAsync<{ count: number }>(
            `SELECT COUNT(*) as count FROM transactions
             WHERE account_id IN (SELECT id FROM accounts WHERE institution_id = ?)`,
            [institution.id],
          );
          showToast(`Synced ${total?.count ?? 0} transactions`, false);
        }
      } else {
        showToast("Up to date", false);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : i18n("account.syncFailed");
      showToast(message, true);
    } finally {
      setRefreshingInstId(null);
    }
  };

  const handleUnlinkInstitution = (institution: InstitutionWithPlaid) => {
    Alert.alert(
      i18n("account.unlink"),
      i18n("account.unlinkConfirm"),
      [
        { text: i18n("common.cancel"), style: "cancel" },
        {
          text: i18n("account.unlink"), style: "destructive",
          onPress: async () => {
            try {
              const db = await getDatabase();
              await unlinkPlaidItem(db, institution.id);
              await loadData();
            } catch {
              Alert.alert(i18n("common.error"), "Failed to unlink institution");
            }
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
    <View style={{ flex: 1, backgroundColor: theme.background }}>
    <SwipeableProvider>
    <SwipeableScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
    >
      {/* Link Bank Account via Plaid */}
      <PlaidLinkButton onSuccess={loadData} />

      {/* Or add manually */}
      <TouchableOpacity
        style={styles.divider}
        onPress={() => { setShowAddForm(!showAddForm); if (showAddForm) resetForm(); }}
        activeOpacity={0.7}
      >
        <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
        <View style={styles.dividerContent}>
          <Text style={[styles.dividerText, { color: theme.accent }]}>
            {i18n("account.orAddManually")}
          </Text>
          <View style={[styles.dividerIcon, { borderColor: theme.accent }]}>
            <Ionicons name="add" size={14} color={theme.accent} />
          </View>
        </View>
        <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
      </TouchableOpacity>

      {/* Manual Add Form */}
      {showAddForm && (
        <View style={[styles.card, { backgroundColor: theme.brand + "10", borderColor: theme.brand + "40" }]}>
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
        </View>
      )}

      {/* Institution List */}
      {institutions.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="business-outline" size={48} color={theme.textSecondary} />
          <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text, marginTop: 16 }}>{i18n("account.noInstitutions")}</Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: "center", marginTop: 8 }}>{i18n("account.noInstitutionsDesc")}</Text>
        </View>
      ) : (
        institutions.map((institution) => {
          const isLinked = !!institution.plaidItemId;
          const isRefreshingThis = refreshingInstId === institution.id;
          return (
          <View key={institution.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {/* Institution header */}
            {!isLinked && institution.accounts.length === 0 ? (
              <SwipeableRow id={institution.id} onDelete={() => handleDeleteInstitution(institution)} dangerColor={theme.danger}>
                <View style={[styles.instHeader, { backgroundColor: theme.card }]}>
                  <Ionicons name="business-outline" size={22} color={theme.accent} />
                  <Text style={[styles.instName, { color: theme.text }]}>{institution.name}</Text>
                </View>
              </SwipeableRow>
            ) : (
              <View style={styles.instHeader}>
                <Ionicons name={isLinked ? "link" : "business-outline"} size={22} color={theme.accent} />
                <Text style={[styles.instName, { color: theme.text }]}>{institution.name}</Text>
                {isLinked && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleRefreshInstitution(institution)}
                      disabled={isRefreshingThis}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {isRefreshingThis ? (
                        <ActivityIndicator size="small" color={theme.accent} />
                      ) : (
                        <Ionicons name="refresh" size={20} color={theme.accent} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleUnlinkInstitution(institution)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="unlink" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}
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
        );})
      )}
    </SwipeableScrollView>
    </SwipeableProvider>
    {toast && (
      <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]}>
        <View style={[styles.toast, { backgroundColor: toast.isError ? "#dc2626" : "#059669" }]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      </Animated.View>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 40 },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dividerIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
  },
  formContent: { padding: 16 },
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
  toastContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  toast: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
