import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createTransactionApi, createAccountApi, createCategoryApi, createInstitutionApi } from "@money-tracker/api-client";
import { apiClient } from "@/lib/api";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";
import { useTransactionModal } from "@/lib/addModal";
import { formatCurrency, parseAmount } from "@money-tracker/shared";
import type { Transaction, TransactionFilters, Account, Category, Institution } from "@money-tracker/shared";
import { getEmojiIcon } from "@/lib/emoji";

const txApi = createTransactionApi(apiClient);
const accApi = createAccountApi(apiClient);
const catApi = createCategoryApi(apiClient);
const instApi = createInstitutionApi(apiClient);
const PAGE_SIZE = 20;

function flattenCategories(cats: Category[]): { id: string; name: string }[] {
  const result: { id: string; name: string }[] = [];
  for (const cat of cats) {
    result.push({ id: cat.id, name: cat.name });
    for (const child of cat.children || []) {
      result.push({ id: child.id, name: `${cat.name} > ${child.name}` });
    }
  }
  return result;
}

export default function TransactionsPage() {
  const { theme } = useAppTheme();
  const { i18n } = useI18n();
  const { openEdit, setOnComplete } = useTransactionModal();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageRef = useRef(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Search & filters
  const [search, setSearch] = useState("");
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  // Filter data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  // Filter picker state
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [pendingAccountIds, setPendingAccountIds] = useState<string[]>([]);
  const [pendingCategoryIds, setPendingCategoryIds] = useState<string[]>([]);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up search timeout on unmount
  useEffect(() => {
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, []);

  // Load filter options
  useEffect(() => {
    Promise.all([accApi.list(), catApi.list(), instApi.list()]).then(([a, c, i]) => {
      setAccounts(a);
      setCategories(c);
      setInstitutions(i);
    });
  }, []);

  const allCats = flattenCategories(categories);

  const activeFilterCount = [accountIds.length > 0, categoryIds.length > 0, startDate, endDate, minAmount, maxAmount].filter(Boolean).length;

  // Serialize filter arrays for dependency tracking
  const accountIdsKey = accountIds.join(",");
  const categoryIdsKey = categoryIds.join(",");

  const buildFilters = useCallback((): TransactionFilters => ({
    page: 1,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    accountId: accountIdsKey || undefined,
    categoryId: categoryIdsKey || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    minAmount: minAmount || undefined,
    maxAmount: maxAmount || undefined,
    sortBy: "date",
    sortOrder: "desc",
  }), [search, accountIdsKey, categoryIdsKey, startDate, endDate, minAmount, maxAmount]);

  const fetchTransactions = useCallback(
    async (pageNum: number, append = false, pageSize = PAGE_SIZE) => {
      try {
        const filters = { ...buildFilters(), page: pageNum, pageSize };
        const response = await txApi.list(filters);
        if (append) {
          setTransactions((prev) => [...prev, ...response.transactions]);
          setHasMore(response.total > pageNum * pageSize);
        } else {
          setTransactions(response.transactions);
          setHasMore(response.total > response.transactions.length);
        }
        setTotal(response.total);
      } catch {
        // ignore
      }
    },
    [buildFilters],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setPage(1);
    pageRef.current = 1;
    setHasMore(true);
    await fetchTransactions(1, false);
    setLoading(false);
  }, [fetchTransactions]);

  const refreshInPlace = useCallback(async () => {
    await fetchTransactions(1, false, PAGE_SIZE * pageRef.current);
  }, [fetchTransactions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    pageRef.current = 1;
    await fetchTransactions(1, false);
    setRefreshing(false);
  }, [fetchTransactions]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    pageRef.current = nextPage;
    await fetchTransactions(nextPage, true);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, fetchTransactions]);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearch(text);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => reload(), 300);
    },
    [reload],
  );

  // Re-fetch when filters change
  useEffect(() => { reload(); }, [accountIdsKey, categoryIdsKey, startDate, endDate, minAmount, maxAmount]);

  useFocusEffect(useCallback(() => {
    reload();
    setOnComplete(() => refreshInPlace);
  }, [reload, refreshInPlace, setOnComplete]));

  const clearAllFilters = () => {
    setAccountIds([]);
    setCategoryIds([]);
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
  };

  const selectedAccountLabel = accountIds.length === 0
    ? undefined
    : accountIds.length === 1
      ? accounts.find((a) => a.id === accountIds[0])?.name
      : `${accountIds.length} accounts`;

  const selectedCategoryLabel = categoryIds.length === 0
    ? undefined
    : categoryIds.length === 1
      ? allCats.find((c) => c.id === categoryIds[0])?.name
      : `${categoryIds.length} categories`;

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${date.getUTCDate()}`;
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const amount = parseAmount(item.amount);
    const isIncome = amount > 0;
    const parentName = item.category?.parent?.name;
    const categoryName = parentName
      ? `${parentName} > ${item.category?.name}`
      : item.category?.name || i18n("overview.uncategorized");
    const emojiIcon = getEmojiIcon(item.category?.emoji);

    return (
      <TouchableOpacity
        style={[styles.transactionRow, { borderColor: theme.cardBorder }]}
        onPress={() => openEdit(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, { backgroundColor: emojiIcon.color + "15" }]}>
          <Ionicons name={emojiIcon.icon} size={20} color={emojiIcon.color} />
        </View>
        <View style={styles.transactionLeft}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={[styles.transactionDescription, { color: theme.text, flexShrink: 1 }]} numberOfLines={1}>
              {item.description || categoryName}
            </Text>
            {item.transactionTags && item.transactionTags.length > 0 && (
              <View style={{ flexDirection: "row", gap: 3 }}>
                {item.transactionTags.map((tt) => (
                  <View key={tt.tag.id} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: tt.tag.color }} />
                ))}
              </View>
            )}
          </View>
          <Text style={[styles.transactionMeta, { color: theme.textSecondary }]} numberOfLines={1}>
            {formatShortDate(item.date)} · {categoryName}
          </Text>
        </View>
        <Text style={[styles.transactionAmount, { color: isIncome ? theme.income : theme.expense }]}>
          {isIncome ? "+" : ""}{formatCurrency(Math.abs(amount))}
        </Text>
      </TouchableOpacity>
    );
  };

  // Filter pill component
  const FilterPill = ({ label, active, value, onPress, onClear }: {
    label: string; active: boolean; value?: string; onPress: () => void; onClear: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.filterPill, { borderColor: active ? theme.accent : theme.cardBorder }, active && { backgroundColor: theme.accent + "15" }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize: 13, fontWeight: "600", color: active ? theme.accent : theme.textSecondary }} numberOfLines={1}>
        {value || label}
      </Text>
      {active && (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={16} color={theme.accent} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  // Open account filter
  const openAccountFilter = () => {
    setPendingAccountIds([...accountIds]);
    setActiveFilter("account");
  };

  const togglePendingAccount = (id: string) => {
    setPendingAccountIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const confirmAccountFilter = () => {
    setAccountIds(pendingAccountIds);
    setActiveFilter(null);
  };

  const selectAllAccounts = () => setPendingAccountIds(accounts.map((a) => a.id));
  const selectNoAccounts = () => setPendingAccountIds([]);

  // Category filter helpers
  const openCategoryFilter = () => {
    setPendingCategoryIds([...categoryIds]);
    setActiveFilter("category");
  };

  const togglePendingCategory = (id: string) => {
    setPendingCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const confirmCategoryFilter = () => {
    setCategoryIds(pendingCategoryIds);
    setActiveFilter(null);
  };

  const selectAllCategories = () => setPendingCategoryIds(allCats.map((c) => c.id));
  const selectNoCategories = () => setPendingCategoryIds([]);

  const hasPendingCategoryChanges = JSON.stringify([...pendingCategoryIds].sort()) !== JSON.stringify([...categoryIds].sort());

  // Build account list with bank names
  const accountOptions = institutions.flatMap((inst) =>
    inst.accounts.map((acct) => ({
      id: acct.id,
      name: `${inst.name} · ${acct.name}`,
    })),
  );

  // Fallback if institutions aren't loaded yet
  const accountList = accountOptions.length > 0
    ? accountOptions
    : accounts.map((a) => ({ id: a.id, name: a.institution?.name ? `${a.institution.name} · ${a.name}` : a.name }));

  const hasPendingChanges = JSON.stringify([...pendingAccountIds].sort()) !== JSON.stringify([...accountIds].sort());

  // Account filter picker (multi-select)
  const renderAccountPicker = () => {
    if (activeFilter !== "account") return null;

    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => setActiveFilter(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setActiveFilter(null)}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text, flex: 1 }]}>{i18n("transaction.account")}</Text>
              <TouchableOpacity onPress={hasPendingChanges ? confirmAccountFilter : () => setActiveFilter(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons
                  name={hasPendingChanges ? "checkmark-circle" : "close"}
                  size={34}
                  color={hasPendingChanges ? theme.brand : theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Select all / none */}
            <View style={styles.selectAllRow}>
              <TouchableOpacity
                style={[styles.selectAllBtn, { backgroundColor: theme.accent + "15", borderColor: theme.accent + "30" }]}
                onPress={selectAllAccounts}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: theme.accent }}>{i18n("transaction.all")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectAllBtn, { backgroundColor: theme.cardBorder + "30", borderColor: theme.cardBorder }]}
                onPress={selectNoAccounts}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: theme.textSecondary }}>{i18n("transaction.none")}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {accountList.map((opt) => {
                const isSelected = pendingAccountIds.includes(opt.id);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.modalOption,
                      { borderBottomColor: theme.cardBorder },
                    ]}
                    onPress={() => togglePendingAccount(opt.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 15, color: isSelected ? theme.accent : theme.text, fontWeight: isSelected ? "600" : "400", flex: 1 }}>
                      {opt.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color={theme.accent} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Category filter picker (multi-select)
  const renderCategoryPicker = () => {
    if (activeFilter !== "category") return null;

    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => setActiveFilter(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setActiveFilter(null)}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text, flex: 1 }]}>{i18n("transaction.categoryOptional")}</Text>
              <TouchableOpacity onPress={hasPendingCategoryChanges ? confirmCategoryFilter : () => setActiveFilter(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons
                  name={hasPendingCategoryChanges ? "checkmark-circle" : "close"}
                  size={34}
                  color={hasPendingCategoryChanges ? theme.brand : theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.selectAllRow}>
              <TouchableOpacity
                style={[styles.selectAllBtn, { backgroundColor: theme.accent + "15", borderColor: theme.accent + "30" }]}
                onPress={selectAllCategories}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: theme.accent }}>{i18n("transaction.all")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectAllBtn, { backgroundColor: theme.cardBorder + "30", borderColor: theme.cardBorder }]}
                onPress={selectNoCategories}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: theme.textSecondary }}>{i18n("transaction.none")}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {allCats.map((opt) => {
                const isSelected = pendingCategoryIds.includes(opt.id);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.modalOption, { borderBottomColor: theme.cardBorder }]}
                    onPress={() => togglePendingCategory(opt.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 15, color: isSelected ? theme.accent : theme.text, fontWeight: isSelected ? "600" : "400", flex: 1 }}>
                      {opt.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color={theme.accent} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Date/amount filter modal
  const renderRangeFilter = () => {
    if (activeFilter !== "date" && activeFilter !== "amount") return null;

    const isDate = activeFilter === "date";
    const title = isDate ? `${i18n("transaction.fromDate")} / ${i18n("transaction.toDate")}` : `${i18n("transaction.minAmount")} / ${i18n("transaction.maxAmount")}`;

    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => setActiveFilter(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setActiveFilter(null)}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
            {isDate ? (
              <>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>{i18n("transaction.fromDate")}</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                  value={startDate}
                  onChangeText={setStartDate}
                  autoCapitalize="none"
                />
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>{i18n("transaction.toDate")}</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                  value={endDate}
                  onChangeText={setEndDate}
                  autoCapitalize="none"
                />
              </>
            ) : (
              <>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>{i18n("transaction.minAmount")}</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.text }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.textSecondary}
                  value={minAmount}
                  onChangeText={setMinAmount}
                  keyboardType="numeric"
                />
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>{i18n("transaction.maxAmount")}</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.text }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.textSecondary}
                  value={maxAmount}
                  onChangeText={setMaxAmount}
                  keyboardType="numeric"
                />
              </>
            )}
            <TouchableOpacity
              style={[styles.modalDoneBtn, { backgroundColor: theme.accent }]}
              onPress={() => setActiveFilter(null)}
              activeOpacity={0.7}
            >
              <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: "600" }}>{i18n("common.done")}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Ionicons name="search-outline" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={i18n("transaction.searchPlaceholder")}
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={handleSearchChange}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange("")} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        <FilterPill
          label={i18n("transaction.account")}
          active={accountIds.length > 0}
          value={selectedAccountLabel}
          onPress={openAccountFilter}
          onClear={() => setAccountIds([])}
        />
        <FilterPill
          label={i18n("transaction.categoryOptional")}
          active={categoryIds.length > 0}
          value={selectedCategoryLabel}
          onPress={openCategoryFilter}
          onClear={() => setCategoryIds([])}
        />
        <FilterPill
          label={i18n("transaction.date")}
          active={!!(startDate || endDate)}
          value={startDate || endDate ? `${startDate || "..."} – ${endDate || "..."}` : undefined}
          onPress={() => setActiveFilter("date")}
          onClear={() => { setStartDate(""); setEndDate(""); }}
        />
        <FilterPill
          label={i18n("transaction.amount")}
          active={!!(minAmount || maxAmount)}
          value={minAmount || maxAmount ? `$${minAmount || "0"} – $${maxAmount || "∞"}` : undefined}
          onPress={() => setActiveFilter("amount")}
          onClear={() => { setMinAmount(""); setMaxAmount(""); }}
        />
        {activeFilterCount > 0 && (
          <TouchableOpacity style={styles.clearAllBtn} onPress={clearAllFilters} activeOpacity={0.7}>
            <Ionicons name="close" size={14} color={theme.danger} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.danger }}>{i18n("transaction.clearFilters")}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          style={styles.flatList}
          contentContainerStyle={styles.listContentNoGrow}
          ListHeaderComponent={!loading ? (
            <View style={styles.countContainer}>
              <Text style={[styles.countText, { color: theme.textSecondary }]}>
                {total} {total === 1 ? i18n("transaction.transactionSingular") : i18n("transaction.transactionPlural")}
              </Text>
            </View>
          ) : null}
          ListEmptyComponent={!loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>{i18n("transaction.noTransactions")}</Text>
            </View>
          ) : null}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={theme.accent} style={{ paddingVertical: 16 }} /> : null}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
        />
      )}

      {renderAccountPicker()}
      {renderCategoryPicker()}
      {renderRangeFilter()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterScroll: { flexGrow: 0 },
  flatList: { flex: 1 },
  listContentNoGrow: { paddingHorizontal: 16, paddingBottom: 20, flexGrow: 0 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 14,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderWidth: 1,
    borderRadius: 17,
  },
  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#ef444440",
    backgroundColor: "#ef444410",
  },
  countContainer: { paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4 },
  countText: { fontSize: 13, fontWeight: "500", textAlign: "center" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  transactionLeft: { flex: 1, gap: 2 },
  transactionDescription: { fontSize: 15, fontWeight: "600" },
  transactionMeta: { fontSize: 13 },
  transactionAmount: { fontSize: 16, fontWeight: "700" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "600", marginTop: 16 },
  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  selectAllRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  selectAllBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 12 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  modalDoneBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
});
