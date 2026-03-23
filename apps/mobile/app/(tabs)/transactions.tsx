import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { createTransactionApi } from "@money-tracker/api-client";
import { formatCurrency, parseAmount } from "@money-tracker/shared";
import type { Transaction, TransactionFilters } from "@money-tracker/shared";
import { apiClient } from "@/lib/api";
import { colors } from "@/lib/theme";

const PAGE_SIZE = 20;

export default function TransactionsScreen() {
  const scheme = useColorScheme();
  const theme = colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();
  const txApi = createTransactionApi(apiClient);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const page = useRef(1);

  const filters: TransactionFilters = {
    includeHidden: true,
    pageSize: PAGE_SIZE,
    sortBy: "date",
    sortOrder: "desc",
  };

  const fetchPage = useCallback(async (p: number, append: boolean) => {
    const data = await txApi.list({ ...filters, page: p });
    if (append) {
      setTransactions((prev) => [...prev, ...data.transactions]);
    } else {
      setTransactions(data.transactions);
    }
    setTotal(data.total);
  }, []);

  useEffect(() => {
    fetchPage(1, false).finally(() => setLoading(false));
  }, [fetchPage]);

  const onRefresh = async () => {
    setRefreshing(true);
    page.current = 1;
    await fetchPage(1, false);
    setRefreshing(false);
  };

  const onEndReached = async () => {
    if (loadingMore || transactions.length >= total) return;
    setLoadingMore(true);
    page.current += 1;
    await fetchPage(page.current, true);
    setLoadingMore(false);
  };

  const renderItem = ({ item: tx }: { item: Transaction }) => {
    const amt = parseAmount(tx.amount);
    return (
      <TouchableOpacity
        style={[styles.txCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: "/modal/transaction-detail", params: { id: tx.id } })}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.txDesc, { color: tx.isHidden ? theme.textSecondary : theme.text }]} numberOfLines={1}>
            {tx.description}
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
            {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {tx.account ? ` · ${tx.account.name}` : ""}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: amt >= 0 ? theme.income : theme.expense, fontWeight: "700", fontSize: 15 }}>
            {formatCurrency(amt)}
          </Text>
          {tx.category && (
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>
              {tx.category.name}
            </Text>
          )}
        </View>
      </TouchableOpacity>
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
      <FlatList
        data={transactions}
        keyExtractor={(tx) => tx.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <Text style={{ color: theme.textSecondary, textAlign: "center", marginTop: 40 }}>
            No transactions yet
          </Text>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ padding: 16 }} color={theme.accent} />
          ) : transactions.length > 0 && transactions.length >= total ? (
            <Text style={{ color: theme.textSecondary, textAlign: "center", padding: 16, fontSize: 13 }}>
              Showing all {total} transactions
            </Text>
          ) : null
        }
      />

      {/* FAB for adding transaction */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        onPress={() => router.push("/modal/add-transaction")}
        activeOpacity={0.8}
      >
        <Text style={{ color: theme.accentText, fontSize: 28, fontWeight: "300", lineHeight: 30 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingBottom: 80 },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  txDesc: { fontSize: 15, fontWeight: "500" },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
});
