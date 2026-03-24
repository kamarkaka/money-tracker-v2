import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { createTransactionApi, createCategoryApi } from "@money-tracker/api-client";
import { formatCurrency, formatDate, parseAmount } from "@money-tracker/shared";
import type { Transaction, Category } from "@money-tracker/shared";
import { apiClient } from "@/lib/api";
import { useAppTheme } from "@/lib/themeContext";

const txApi = createTransactionApi(apiClient);
const catApi = createCategoryApi(apiClient);

export default function TransactionDetailModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useAppTheme();
  const router = useRouter();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategories, setShowCategories] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      txApi.list({ pageSize: 1, search: id }),
      catApi.list(),
    ]).then(([txData, cats]) => {
      // Find the specific transaction
      const found = txData.transactions.find((t) => t.id === id);
      setTransaction(found || null);
      setCategories(cats);
      setLoading(false);
    });
  }, [id]);

  const handleUpdateCategory = async (categoryId: string | null) => {
    if (!id) return;
    await txApi.update(id, { categoryId });
    // Refresh
    const txData = await txApi.list({ pageSize: 1, search: id });
    const found = txData.transactions.find((t) => t.id === id);
    setTransaction(found || null);
    setShowCategories(false);
  };

  const handleDelete = () => {
    Alert.alert("Delete Transaction", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!id) return;
          await txApi.remove(id);
          router.back();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>Transaction not found</Text>
      </View>
    );
  }

  const amt = parseAmount(transaction.amount);

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.accent, fontSize: 16 }}>Close</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Transaction</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Text style={{ color: theme.danger, fontSize: 16 }}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Amount */}
      <Text style={[styles.amount, { color: amt >= 0 ? theme.income : theme.expense }]}>
        {formatCurrency(amt)}
      </Text>

      {/* Details */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <DetailRow label="Description" value={transaction.description} theme={theme} />
        <DetailRow label="Date" value={formatDate(transaction.date)} theme={theme} />
        <DetailRow label="Account" value={transaction.account?.name || "-"} theme={theme} />
        <View style={[styles.detailRow, { borderBottomColor: theme.cardBorder }]}>
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>Category</Text>
          <TouchableOpacity onPress={() => setShowCategories(!showCategories)}>
            <Text style={{ color: theme.accent, fontSize: 14, fontWeight: "500" }}>
              {transaction.category?.name || "Uncategorized"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category picker */}
      {showCategories && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <TouchableOpacity
            style={[styles.catItem, { borderBottomColor: theme.cardBorder }, !transaction.categoryId && { backgroundColor: theme.accent + "20" }]}
            onPress={() => handleUpdateCategory(null)}
          >
            <Text style={{ color: !transaction.categoryId ? theme.accent : theme.text }}>Uncategorized</Text>
          </TouchableOpacity>
          {categories.filter((c) => !c.parentId).map((cat) => (
            <View key={cat.id}>
              <TouchableOpacity
                style={[styles.catItem, { borderBottomColor: theme.cardBorder }, transaction.categoryId === cat.id && { backgroundColor: theme.accent + "20" }]}
                onPress={() => handleUpdateCategory(cat.id)}
              >
                <Text style={{ color: transaction.categoryId === cat.id ? theme.accent : theme.text, fontWeight: "600" }}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
              {cat.children?.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  style={[styles.catItem, { paddingLeft: 28, borderBottomColor: theme.cardBorder }, transaction.categoryId === sub.id && { backgroundColor: theme.accent + "20" }]}
                  onPress={() => handleUpdateCategory(sub.id)}
                >
                  <Text style={{ color: transaction.categoryId === sub.id ? theme.accent : theme.text }}>
                    {sub.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function DetailRow({ label, value, theme }: { label: string; value: string; theme: { text: string; textSecondary: string; cardBorder: string } }) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: theme.cardBorder }]}>
      <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: "500" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingTop: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  amount: { fontSize: 40, fontWeight: "800", textAlign: "center", marginBottom: 24 },
  card: { borderWidth: 1, borderRadius: 14, overflow: "hidden", marginBottom: 16 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  catItem: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
