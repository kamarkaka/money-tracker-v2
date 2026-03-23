import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
} from "react-native";
import { createTransactionApi, createCategoryApi, createBudgetApi } from "@money-tracker/api-client";
import { formatCurrency, parseAmount } from "@money-tracker/shared";
import type { Transaction, Category, BudgetBucket, BucketGroup } from "@money-tracker/shared";
import { apiClient } from "@/lib/api";
import { colors } from "@/lib/theme";

const BUCKET_COLORS = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

export default function OverviewScreen() {
  const scheme = useColorScheme();
  const theme = colors[scheme === "dark" ? "dark" : "light"];
  const txApi = createTransactionApi(apiClient);
  const catApi = createCategoryApi(apiClient);
  const budgetApi = createBudgetApi(apiClient);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<BudgetBucket[]>([]);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const fetchData = useCallback(async () => {
    const startDate = new Date(year, month, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

    const [txData, catData, budgetData] = await Promise.all([
      txApi.list({ startDate, endDate, pageSize: 0 }),
      catApi.list(),
      budgetApi.list(),
    ]);

    setTransactions(txData.transactions);
    setCategories(catData);
    setBudgets(budgetData);
  }, [year, month]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  // Group transactions by bucket
  const categoryToBucket = new Map<string, string>();
  budgets.forEach((b) => {
    b.categories.forEach((bc) => categoryToBucket.set(bc.category.id, b.name));
  });

  const bucketGroups = new Map<string, Transaction[]>();
  const uncategorized: Transaction[] = [];

  budgets.forEach((b) => bucketGroups.set(b.name, []));

  transactions.forEach((tx) => {
    if (!tx.categoryId || !categoryToBucket.has(tx.categoryId)) {
      uncategorized.push(tx);
    } else {
      const name = categoryToBucket.get(tx.categoryId)!;
      bucketGroups.get(name)!.push(tx);
    }
  });

  const groups: BucketGroup[] = Array.from(bucketGroups.entries()).map(([bucketName, txs]) => {
    const budget = budgets.find((b) => b.name === bucketName);
    return {
      bucketName,
      bucketIcon: budget?.icon,
      budgetAmount: parseAmount(budget?.amount ?? 0),
      transactions: txs,
      total: txs.reduce((sum, t) => sum + parseAmount(t.amount), 0),
    };
  });

  // Totals (exclude transfer)
  const transferCat = categories.find((c) => !c.parentId && c.name.toLowerCase() === "transfer");
  const transferIds = new Set<string>();
  if (transferCat) {
    transferIds.add(transferCat.id);
    transferCat.children?.forEach((ch) => transferIds.add(ch.id));
  }
  const nonTransfer = transactions.filter((t) => !t.categoryId || !transferIds.has(t.categoryId));
  const totalIncome = nonTransfer.filter((t) => parseAmount(t.amount) > 0).reduce((s, t) => s + parseAmount(t.amount), 0);
  const totalExpenses = nonTransfer.filter((t) => parseAmount(t.amount) < 0).reduce((s, t) => s + parseAmount(t.amount), 0);

  const monthLabel = new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" });

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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
    >
      {/* Month Picker */}
      <View style={styles.monthPicker}>
        <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
          <Text style={{ color: theme.accent, fontSize: 20 }}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: theme.text }]}>{monthLabel}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
          <Text style={{ color: theme.accent, fontSize: 20 }}>{">"}</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Income</Text>
            <Text style={{ color: theme.income, fontSize: 20, fontWeight: "700" }}>
              {formatCurrency(totalIncome)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.cardBorder }]} />
          <View style={styles.summaryItem}>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Expenses</Text>
            <Text style={{ color: theme.expense, fontSize: 20, fontWeight: "700" }}>
              {formatCurrency(Math.abs(totalExpenses))}
            </Text>
          </View>
        </View>
      </View>

      {/* Bucket Cards */}
      {groups.map((group, i) => (
        <BucketCard key={group.bucketName} group={group} theme={theme} colorIndex={i} />
      ))}

      {/* Uncategorized */}
      {uncategorized.length > 0 && (
        <View style={[styles.bucketCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.bucketName, { color: theme.textSecondary }]}>
            Uncategorized ({uncategorized.length})
          </Text>
          {uncategorized.slice(0, 5).map((tx) => (
            <TransactionRow key={tx.id} tx={tx} theme={theme} />
          ))}
          {uncategorized.length > 5 && (
            <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: "center", paddingTop: 8 }}>
              +{uncategorized.length - 5} more
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function BucketCard({ group, theme, colorIndex }: { group: BucketGroup; theme: typeof colors.light; colorIndex: number }) {
  const [expanded, setExpanded] = useState(false);
  const color = BUCKET_COLORS[colorIndex % BUCKET_COLORS.length];
  const spent = Math.abs(group.total);
  const budget = group.budgetAmount;
  const pct = budget > 0 ? Math.min(spent / budget, 1) : 0;

  return (
    <View style={[styles.bucketCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View style={styles.bucketHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            {group.bucketIcon && <Text style={{ fontSize: 20 }}>{group.bucketIcon}</Text>}
            <Text style={[styles.bucketName, { color: theme.text }]}>{group.bucketName}</Text>
          </View>
          <Text style={{ color: theme.expense, fontWeight: "600" }}>
            {formatCurrency(spent)}
            {budget > 0 && <Text style={{ color: theme.textSecondary, fontWeight: "400" }}> / {formatCurrency(budget)}</Text>}
          </Text>
        </View>

        {budget > 0 && (
          <View style={[styles.progressBg, { backgroundColor: theme.cardBorder }]}>
            <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: pct > 0.9 ? theme.expense : color }]} />
          </View>
        )}
      </TouchableOpacity>

      {expanded && group.transactions.map((tx) => (
        <TransactionRow key={tx.id} tx={tx} theme={theme} />
      ))}
    </View>
  );
}

function TransactionRow({ tx, theme }: { tx: Transaction; theme: typeof colors.light }) {
  const amt = parseAmount(tx.amount);
  return (
    <View style={styles.txRow}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontSize: 14 }} numberOfLines={1}>{tx.description}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
          {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {tx.category ? ` · ${tx.category.name}` : ""}
        </Text>
      </View>
      <Text style={{ color: amt >= 0 ? theme.income : theme.expense, fontWeight: "600", fontSize: 14 }}>
        {formatCurrency(amt)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 32 },
  monthPicker: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20, marginBottom: 16 },
  monthArrow: { padding: 8 },
  monthLabel: { fontSize: 18, fontWeight: "700" },
  summaryCard: { borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 16 },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryDivider: { width: 1, height: 40 },
  bucketCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  bucketHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bucketName: { fontSize: 16, fontWeight: "700" },
  progressBg: { height: 6, borderRadius: 3, marginTop: 10 },
  progressFill: { height: 6, borderRadius: 3 },
  txRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e2e8f0" },
});
