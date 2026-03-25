import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createTransactionApi } from "@money-tracker/api-client";
import { apiClient } from "@/lib/api";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";
import { useTransactionModal } from "@/lib/addModal";
import { formatCurrency, parseAmount } from "@money-tracker/shared";
import type { Transaction, TransactionFilters } from "@money-tracker/shared";

const api = createTransactionApi(apiClient);
const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const { theme } = useAppTheme();
  const { i18n } = useI18n();
  const { openEdit } = useTransactionModal();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [hasMore, setHasMore] = useState(true);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTransactions = useCallback(
    async (pageNum: number, searchQuery: string, append = false) => {
      try {
        const filters: TransactionFilters = {
          page: pageNum,
          pageSize: PAGE_SIZE,
          search: searchQuery || undefined,
          sortBy: "date",
          sortOrder: "desc",
        };

        const response = await api.list(filters);

        if (append) {
          setTransactions((prev) => [...prev, ...response.transactions]);
        } else {
          setTransactions(response.transactions);
        }

        setTotal(response.total);
        setHasMore(response.transactions.length === PAGE_SIZE);
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      }
    },
    []
  );

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    await fetchTransactions(1, search, false);
    setLoading(false);
  }, [fetchTransactions, search]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await fetchTransactions(1, search, false);
    setRefreshing(false);
  }, [fetchTransactions, search]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchTransactions(nextPage, search, true);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, fetchTransactions, search]);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearch(text);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        setPage(1);
        setHasMore(true);
        setLoading(true);
        fetchTransactions(1, text, false).finally(() => setLoading(false));
      }, 300);
    },
    [fetchTransactions]
  );

  const handleTransactionPress = useCallback(
    (transaction: Transaction) => {
      openEdit(transaction);
    },
    [openEdit]
  );

  // Re-fetch when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [loadInitialData])
  );

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    const day = date.getUTCDate();
    return `${month} ${day}`;
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const amount = parseAmount(item.amount);
    const isIncome = amount > 0;
    const categoryName = item.category?.name || i18n("overview.uncategorized");

    return (
      <TouchableOpacity
        style={[styles.transactionRow, { borderColor: theme.cardBorder }]}
        onPress={() => handleTransactionPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.transactionLeft}>
          <Text style={[styles.transactionDate, { color: theme.textSecondary }]}>
            {formatShortDate(item.date)}
          </Text>
          <Text style={[styles.transactionDescription, { color: theme.text }]} numberOfLines={1}>
            {item.description || categoryName}
          </Text>
          <Text style={[styles.transactionCategory, { color: theme.textSecondary }]} numberOfLines={1}>
            {categoryName}
          </Text>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            { color: isIncome ? theme.income : theme.expense },
          ]}
        >
          {isIncome ? "+" : ""}
          {formatCurrency(Math.abs(amount))}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="receipt-outline" size={64} color={theme.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          {i18n("transaction.noTransactions")}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.accent} />
      </View>
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

      {/* Transaction Count */}
      {!loading && (
        <View style={styles.countContainer}>
          <Text style={[styles.countText, { color: theme.textSecondary }]}>
            {i18n("transaction.transactionsFound").replace("{count}", String(total))}
          </Text>
        </View>
      )}

      {/* Transaction List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          }
          indicatorStyle={theme.scrollIndicator === "rgba(0,0,0,0.15)" ? "default" : "white"}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  countText: {
    fontSize: 13,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  transactionLeft: {
    flex: 1,
    gap: 2,
  },
  transactionDate: {
    fontSize: 12,
    fontWeight: "500",
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: "600",
  },
  transactionCategory: {
    fontSize: 13,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
});
