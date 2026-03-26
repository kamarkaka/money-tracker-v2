import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createAccountApi, createBudgetApi, createTransactionApi, createSettingsApi, createCategoryApi } from "@money-tracker/api-client";
import { apiClient } from "@/lib/api";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";

const accApi = createAccountApi(apiClient);
const catApi = createCategoryApi(apiClient);
const budgetApi = createBudgetApi(apiClient);
const txApi = createTransactionApi(apiClient);
const settingsApi = createSettingsApi(apiClient);

interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  done: boolean;
  route: string;
}

interface SetupChecklistProps {
  onDismiss: () => void;
  onAllComplete: () => void;
}

export function SetupChecklist({ onDismiss, onAllComplete }: SetupChecklistProps) {
  const { theme } = useAppTheme();
  const { i18n } = useI18n();
  const router = useRouter();
  const [items, setItems] = useState<ChecklistItem[] | null>(null);

  const checkProgress = useCallback(async () => {
    const [accounts, categories, budgets, txData] = await Promise.all([
      accApi.list(),
      catApi.list(),
      budgetApi.list(),
      txApi.list({ pageSize: 1 }),
    ]);

    const hasAccount = accounts.length > 1;
    const hasCustomizedCategories = categories.some((c: any) => c.children && c.children.length > 0);
    const hasBudget = budgets.length > 0;
    const hasTransaction = txData.total > 0;

    const checklist: ChecklistItem[] = [
      {
        key: "account",
        label: i18n("checklist.addAccount"),
        description: i18n("checklist.addAccountDesc"),
        done: hasAccount,
        route: "/pages/accounts",
      },
      {
        key: "category",
        label: i18n("checklist.customizeCategories"),
        description: i18n("checklist.customizeCategoriesDesc"),
        done: hasCustomizedCategories,
        route: "/pages/categories",
      },
      {
        key: "budget",
        label: i18n("checklist.setBudget"),
        description: i18n("checklist.setBudgetDesc"),
        done: hasBudget,
        route: "/pages/budgets",
      },
      {
        key: "transaction",
        label: i18n("checklist.addTransaction"),
        description: i18n("checklist.addTransactionDesc"),
        done: hasTransaction,
        route: "/pages/transactions",
      },
    ];

    setItems(checklist);

    if (checklist.every((item) => item.done)) {
      onAllComplete();
    }
  }, [i18n, onAllComplete]);

  useEffect(() => {
    checkProgress();
  }, [checkProgress]);

  if (!items) return null;

  const completedCount = items.filter((item) => item.done).length;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>{i18n("checklist.title")}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {i18n("checklist.subtitle")}
          </Text>
        </View>
        <Text style={[styles.progress, { color: theme.brand }]}>
          {completedCount}/{items.length}
        </Text>
      </View>

      {items.map((item, idx) => (
        <TouchableOpacity
          key={item.key}
          style={[
            styles.itemRow,
            idx < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.cardBorder },
          ]}
          onPress={() => {
            if (!item.done) {
              router.push(item.route as never);
            }
          }}
          activeOpacity={item.done ? 1 : 0.6}
        >
          <View style={[
            styles.checkCircle,
            item.done
              ? { backgroundColor: theme.brand }
              : { borderWidth: 2, borderColor: theme.cardBorder },
          ]}>
            {item.done && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[
              styles.itemLabel,
              { color: item.done ? theme.textSecondary : theme.text },
              item.done && styles.itemDone,
            ]}>
              {item.label}
            </Text>
            <Text style={[styles.itemDesc, { color: theme.textSecondary }]}>
              {item.description}
            </Text>
          </View>
          {!item.done && (
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          )}
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} activeOpacity={0.6}>
        <Text style={[styles.dismissText, { color: theme.textSecondary }]}>
          {i18n("checklist.dismiss")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  progress: {
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemDone: {
    textDecorationLine: "line-through",
  },
  itemDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  dismissBtn: {
    padding: 12,
    alignItems: "center",
  },
  dismissText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
