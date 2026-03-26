import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createBudgetApi, createCategoryApi } from "@money-tracker/api-client";
import { apiClient } from "@/lib/api";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";
import { useSubscription } from "@/lib/subscription";
import { formatCurrency } from "@money-tracker/shared";
import { getEmojiIcon, DEFAULT_CATEGORY_ICONS, ALL_CATEGORY_ICONS } from "@/lib/emoji";
import { SwipeableRow, SwipeableProvider, SwipeableScrollView } from "@/components/SwipeableRow";
import type { BudgetBucket, Category } from "@money-tracker/shared";

const budgetApi = createBudgetApi(apiClient);
const categoryApi = createCategoryApi(apiClient);

// Flatten category tree to include subcategories
function flattenCategories(cats: Category[]): { id: string; name: string; parentName?: string }[] {
  const result: { id: string; name: string; parentName?: string }[] = [];
  for (const cat of cats) {
    result.push({ id: cat.id, name: cat.name });
    for (const child of cat.children || []) {
      result.push({ id: child.id, name: child.name, parentName: cat.name });
    }
  }
  return result;
}

export default function BudgetsPage() {
  const { theme } = useAppTheme();
  const { i18n } = useI18n();
  const { isPro } = useSubscription();
  const iconList = isPro ? ALL_CATEGORY_ICONS : DEFAULT_CATEGORY_ICONS;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [budgets, setBudgets] = useState<BudgetBucket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addIcon, setAddIcon] = useState<string | null>(null);
  const [addCategoryIds, setAddCategoryIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editIcon, setEditIcon] = useState<string | null>(null);
  const [editCategoryIds, setEditCategoryIds] = useState<string[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [b, c] = await Promise.all([budgetApi.list(), categoryApi.list()]);
      setBudgets(b);
      setCategories(c);
    } catch {
      Alert.alert(i18n("common.error"), "Failed to load budgets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => { setRefreshing(true); loadData(); };

  const allCats = flattenCategories(categories);

  const toggleCategory = (
    ids: string[],
    setIds: (ids: string[]) => void,
    catId: string,
  ) => {
    setIds(ids.includes(catId) ? ids.filter((id) => id !== catId) : [...ids, catId]);
  };

  const handleAddBudget = async () => {
    if (!addName.trim()) { Alert.alert(i18n("common.error"), "Please enter a budget name"); return; }
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) { Alert.alert(i18n("common.error"), "Please enter a valid amount"); return; }

    setSubmitting(true);
    try {
      const newBudget = await budgetApi.create({
        name: addName.trim(),
        amount,
        icon: addIcon || undefined,
        categoryIds: addCategoryIds,
      });
      setBudgets([...budgets, newBudget]);
      setShowAddForm(false);
      setAddName(""); setAddAmount(""); setAddIcon(null); setAddCategoryIds([]);
    } catch {
      Alert.alert(i18n("common.error"), "Failed to create budget");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditBudget = (budget: BudgetBucket) => {
    setEditingId(budget.id);
    setEditName(budget.name);
    setEditAmount(budget.amount.toString());
    setEditIcon(budget.icon || null);
    setEditCategoryIds(budget.categories.map((c) => c.category.id));
  };

  const handleSaveEdit = async (budgetId: string) => {
    if (!editName.trim()) { Alert.alert(i18n("common.error"), "Please enter a budget name"); return; }
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) { Alert.alert(i18n("common.error"), "Please enter a valid amount"); return; }

    setSubmitting(true);
    try {
      const updated = await budgetApi.update(budgetId, {
        name: editName.trim(),
        amount,
        icon: editIcon || undefined,
        categoryIds: editCategoryIds,
      });
      setBudgets(budgets.map((b) => (b.id === budgetId ? updated : b)));
      setEditingId(null);
    } catch {
      Alert.alert(i18n("common.error"), "Failed to update budget");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBudget = (budget: BudgetBucket) => {
    Alert.alert(i18n("budget.deleteBudget"), i18n("budget.deleteWarning"), [
      { text: i18n("common.cancel"), style: "cancel" },
      {
        text: i18n("common.delete"), style: "destructive",
        onPress: async () => {
          try { await budgetApi.remove(budget.id); setBudgets(budgets.filter((b) => b.id !== budget.id)); }
          catch { Alert.alert(i18n("common.error"), "Failed to delete budget"); }
        },
      },
    ]);
  };

  // Renders the icon selector + category pills used in both add and edit forms
  function renderFormFields(
    name: string, setName: (s: string) => void,
    amount: string, setAmount: (s: string) => void,
    icon: string | null, setIcon: (s: string | null) => void,
    selectedIds: string[], setSelectedIds: (ids: string[]) => void,
  ) {
    return (
      <>
        {/* Name */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {i18n("budget.budgetName")}
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.cardBorder }]}
          value={name}
          onChangeText={setName}
          placeholder={i18n("budget.namePlaceholder")}
          placeholderTextColor={theme.textSecondary}
        />

        {/* Icon selector */}
        <ScrollView style={styles.iconScroll} nestedScrollEnabled>
          <View style={styles.iconGrid}>
            {iconList.map((item) => {
              const isSelected = icon === item.emoji;
              return (
                <TouchableOpacity
                  key={item.emoji}
                  style={[
                    styles.iconBtn,
                    { borderColor: isSelected ? item.icon.color : theme.cardBorder, backgroundColor: theme.card },
                    isSelected && { backgroundColor: item.icon.color + "20", borderColor: item.icon.color },
                  ]}
                  onPress={() => setIcon(isSelected ? null : item.emoji)}
                >
                  <Ionicons name={item.icon.icon} size={26} color={isSelected ? item.icon.color : theme.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Amount */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {i18n("budget.monthlyAmount")}
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.cardBorder }]}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={theme.textSecondary}
          keyboardType="numeric"
        />

        {/* Category pills */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {i18n("budget.categories")}
        </Text>
        {allCats.length === 0 ? (
          <Text style={{ color: theme.textSecondary, fontSize: 14, padding: 8 }}>
            {i18n("budget.noCategoriesAssigned")}
          </Text>
        ) : (
          <View style={styles.pillGrid}>
            {allCats.map((cat) => {
              const isSelected = selectedIds.includes(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.pill,
                    { borderColor: isSelected ? theme.accent : theme.cardBorder },
                    isSelected && { backgroundColor: theme.accent + "15" },
                  ]}
                  onPress={() => toggleCategory(selectedIds, setSelectedIds, cat.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, { color: isSelected ? theme.accent : theme.text }]}>
                    {cat.parentName ? `${cat.parentName} > ${cat.name}` : cat.name}
                  </Text>
                  {isSelected && (
                    <TouchableOpacity
                      onPress={() => toggleCategory(selectedIds, setSelectedIds, cat.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={16} color={theme.accent} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </>
    );
  }

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
      {/* Add Budget Button */}
      <View style={[styles.card, showAddForm ? { backgroundColor: theme.brand + "10", borderColor: theme.brand + "40" } : { backgroundColor: theme.brand, borderColor: theme.brand }]}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => { setShowAddForm(!showAddForm); if (showAddForm) { setAddName(""); setAddAmount(""); setAddIcon(null); setAddCategoryIds([]); } }} activeOpacity={0.7}>
          <Text style={[styles.cardTitle, { color: showAddForm ? theme.text : theme.brandText, textAlign: "center", flex: 1 }]}>
            {i18n("budget.createBudget")}
          </Text>
        </TouchableOpacity>

        {showAddForm && (
          <View style={styles.formContent}>
            {renderFormFields(addName, setAddName, addAmount, setAddAmount, addIcon, setAddIcon, addCategoryIds, setAddCategoryIds)}

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.accent, opacity: submitting ? 0.5 : 1 }]}
              onPress={handleAddBudget}
              disabled={submitting}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={theme.accentText} />
              ) : (
                <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: "600" }}>
                  {i18n("budget.createBudget")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Budget List */}
      {budgets.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="wallet-outline" size={48} color={theme.textSecondary} />
          <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text, marginTop: 16 }}>{i18n("budget.noBudgets")}</Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: "center", marginTop: 8 }}>{i18n("budget.noBudgetsDesc")}</Text>
        </View>
      ) : (
        budgets.map((budget) => {
          const isEditing = editingId === budget.id;
          const budgetIcon = budget.icon ? getEmojiIcon(budget.icon) : null;

          return (
            <View key={budget.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              {isEditing ? (
                <View style={styles.formContent}>
                  {renderFormFields(editName, setEditName, editAmount, setEditAmount, editIcon, setEditIcon, editCategoryIds, setEditCategoryIds)}
                  <View style={styles.editBtns}>
                    <TouchableOpacity
                      style={[styles.editBtn, { borderColor: theme.cardBorder }]}
                      onPress={() => setEditingId(null)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: theme.textSecondary, fontSize: 16, fontWeight: "600" }}>{i18n("common.cancel")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editBtn, { backgroundColor: theme.accent, borderColor: theme.accent }]}
                      onPress={() => handleSaveEdit(budget.id)}
                      disabled={submitting}
                      activeOpacity={0.7}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color={theme.accentText} />
                      ) : (
                        <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: "600" }}>{i18n("common.save")}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <SwipeableRow id={budget.id} onDelete={() => handleDeleteBudget(budget)} dangerColor={theme.danger}>
                  <TouchableOpacity
                    style={[styles.budgetContent, { backgroundColor: theme.card }]}
                    onPress={() => handleEditBudget(budget)}
                    activeOpacity={1}
                  >
                    <View style={styles.budgetHeader}>
                      {budgetIcon && (
                        <Ionicons name={budgetIcon.icon} size={28} color={budgetIcon.color} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.budgetName, { color: theme.text }]}>{budget.name}</Text>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: theme.accent, marginTop: 2 }}>
                          {formatCurrency(budget.amount)} / {i18n("paywall.mo")}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                    </View>

                    {budget.categories.length > 0 && (
                      <View style={styles.budgetPills}>
                        {budget.categories.map((c) => {
                          const catInfo = allCats.find((ac) => ac.id === c.category.id);
                          const displayName = catInfo?.parentName
                            ? `${catInfo.parentName} > ${catInfo.name}`
                            : c.category.name;
                          return (
                            <View key={c.category.id} style={[styles.pill, { backgroundColor: theme.accent + "10", borderColor: theme.accent + "30" }]}>
                              <Text style={[styles.pillText, { color: theme.accent }]}>{displayName}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </TouchableOpacity>
                </SwipeableRow>
              )}
            </View>
          );
        })
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
    justifyContent: "space-between",
    padding: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  formContent: { paddingHorizontal: 16, paddingBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  iconScroll: { maxHeight: 210, marginTop: 12 },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
  },
  iconBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  pillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 13, fontWeight: "600" },
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
  budgetContent: {
    padding: 16,
  },
  budgetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  budgetName: { fontSize: 17, fontWeight: "700" },
  budgetPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  editBtns: { flexDirection: "row", gap: 10, marginTop: 20 },
  editBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
});
