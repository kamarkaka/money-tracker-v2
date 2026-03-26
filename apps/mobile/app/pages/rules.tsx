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
import { createCategoryApi } from "@money-tracker/api-client";
import { apiClient } from "@/lib/api";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";
import { getEmojiIcon } from "@/lib/emoji";
import { SwipeableRow, SwipeableProvider, SwipeableScrollView } from "@/components/SwipeableRow";
import type { Category } from "@money-tracker/shared";

const categoryApi = createCategoryApi(apiClient);

interface Rule {
  id: string;
  sequence: number;
  match: string;
  categoryId: string;
  category?: { id: string; name: string };
}

// Flatten category tree
function flattenCategories(cats: Category[]): { id: string; name: string; emoji?: string | null }[] {
  const result: { id: string; name: string; emoji?: string | null }[] = [];
  for (const cat of cats) {
    result.push({ id: cat.id, name: cat.name, emoji: cat.emoji });
    for (const child of cat.children || []) {
      result.push({ id: child.id, name: `${cat.name} > ${child.name}`, emoji: child.emoji });
    }
  }
  return result;
}

export default function RulesPage() {
  const { theme } = useAppTheme();
  const { i18n } = useI18n();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMatch, setAddMatch] = useState("");
  const [addCategoryId, setAddCategoryId] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMatch, setEditMatch] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [showEditCategoryPicker, setShowEditCategoryPicker] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [rulesData, catsData] = await Promise.all([
        apiClient.get<Rule[]>("/api/rules"),
        categoryApi.list(),
      ]);
      setRules(rulesData);
      setCategories(catsData);
    } catch {
      Alert.alert(i18n("common.error"), "Failed to load rules");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => { setRefreshing(true); loadData(); };

  const allCats = flattenCategories(categories);
  const getCatName = (catId: string | null) => {
    if (!catId) return i18n("rule.selectCategory");
    return allCats.find((c) => c.id === catId)?.name || "Unknown";
  };

  const handleAddRule = async () => {
    if (!addMatch.trim()) { Alert.alert(i18n("common.error"), "Please enter a match string"); return; }
    if (!addCategoryId) { Alert.alert(i18n("common.error"), i18n("rule.selectCategory")); return; }

    setSubmitting(true);
    try {
      const newRule = await apiClient.post<Rule>("/api/rules", {
        match: addMatch.trim(),
        categoryId: addCategoryId,
      });
      setRules([...rules, newRule]);
      setShowAddForm(false);
      setAddMatch(""); setAddCategoryId(null);
    } catch {
      Alert.alert(i18n("common.error"), "Failed to create rule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRule = (rule: Rule) => {
    setEditingId(rule.id);
    setEditMatch(rule.match);
    setEditCategoryId(rule.categoryId);
  };

  const handleSaveEdit = async (ruleId: string) => {
    if (!editMatch.trim() || !editCategoryId) { setEditingId(null); return; }
    setSubmitting(true);
    try {
      const updated = await apiClient.put<Rule>(`/api/rules/${ruleId}`, {
        match: editMatch.trim(),
        categoryId: editCategoryId,
      });
      setRules(rules.map((r) => (r.id === ruleId ? updated : r)));
      setEditingId(null);
    } catch {
      Alert.alert(i18n("common.error"), "Failed to update rule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = (rule: Rule) => {
    Alert.alert(i18n("rule.deleteRule"), i18n("rule.deleteWarning"), [
      { text: i18n("common.cancel"), style: "cancel" },
      {
        text: i18n("common.delete"), style: "destructive",
        onPress: async () => {
          try { await apiClient.delete(`/api/rules/${rule.id}`); setRules(rules.filter((r) => r.id !== rule.id)); }
          catch { Alert.alert(i18n("common.error"), "Failed to delete rule"); }
        },
      },
    ]);
  };

  function renderCategoryPicker(
    selectedId: string | null,
    onSelect: (id: string) => void,
    visible: boolean,
    setVisible: (v: boolean) => void,
  ) {
    return (
      <>
        <TouchableOpacity
          style={[styles.picker, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
          onPress={() => setVisible(!visible)}
          activeOpacity={0.7}
        >
          <Text style={{ color: selectedId ? theme.text : theme.textSecondary, flex: 1 }}>
            {getCatName(selectedId)}
          </Text>
          <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
        {visible && (
          <ScrollView style={[styles.pickerOptions, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]} nestedScrollEnabled>
            {allCats.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.pickerOption, { borderBottomColor: theme.cardBorder }]}
                onPress={() => { onSelect(cat.id); setVisible(false); }}
                activeOpacity={0.7}
              >
                {cat.emoji && (
                  <Ionicons name={getEmojiIcon(cat.emoji).icon} size={18} color={getEmojiIcon(cat.emoji).color} style={{ marginRight: 8 }} />
                )}
                <Text style={[styles.pickerOptionText, { color: selectedId === cat.id ? theme.accent : theme.text, fontWeight: selectedId === cat.id ? "600" : "400" }]}>
                  {cat.name}
                </Text>
                {selectedId === cat.id && <Ionicons name="checkmark" size={20} color={theme.accent} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
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
      {/* Add Rule Button */}
      <View style={[styles.card, showAddForm ? { backgroundColor: theme.brand + "10", borderColor: theme.brand + "40" } : { backgroundColor: theme.brand, borderColor: theme.brand }]}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => { setShowAddForm(!showAddForm); if (showAddForm) { setAddMatch(""); setAddCategoryId(null); } }}
          activeOpacity={0.7}
        >
          <Text style={[styles.cardTitle, { color: showAddForm ? theme.text : theme.brandText, textAlign: "center", flex: 1 }]}>
            {i18n("rule.addRule")}
          </Text>
        </TouchableOpacity>

        {showAddForm && (
          <View style={styles.formContent}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{i18n("rule.matchString")}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.text }]}
              placeholder={i18n("rule.matchPlaceholder")}
              placeholderTextColor={theme.textSecondary}
              value={addMatch}
              onChangeText={setAddMatch}
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>{i18n("rule.targetCategory")}</Text>
            {renderCategoryPicker(addCategoryId, setAddCategoryId, showCategoryPicker, setShowCategoryPicker)}

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.accent, opacity: !addMatch.trim() || !addCategoryId || submitting ? 0.5 : 1 }]}
              onPress={handleAddRule}
              disabled={!addMatch.trim() || !addCategoryId || submitting}
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

      {/* Rule List */}
      {rules.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="funnel-outline" size={48} color={theme.textSecondary} />
          <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text, marginTop: 16 }}>{i18n("rule.noRules")}</Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: "center", marginTop: 8 }}>{i18n("rule.noRulesDesc")}</Text>
        </View>
      ) : (
        rules.map((rule) => {
          const isEditing = editingId === rule.id;
          const catName = getCatName(rule.categoryId);

          return (
            <View key={rule.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              {isEditing ? (
                <View style={styles.formContent}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>{i18n("rule.matchString")}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.text }]}
                    value={editMatch}
                    onChangeText={setEditMatch}
                    autoCapitalize="none"
                  />

                  <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>{i18n("rule.targetCategory")}</Text>
                  {renderCategoryPicker(editCategoryId, setEditCategoryId, showEditCategoryPicker, setShowEditCategoryPicker)}

                  <View style={styles.editBtns}>
                    <TouchableOpacity style={[styles.editBtn, { borderColor: theme.cardBorder }]} onPress={() => setEditingId(null)} activeOpacity={0.7}>
                      <Text style={{ color: theme.textSecondary, fontSize: 16, fontWeight: "600" }}>{i18n("common.cancel")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.editBtn, { backgroundColor: theme.accent, borderColor: theme.accent }]} onPress={() => handleSaveEdit(rule.id)} disabled={submitting} activeOpacity={0.7}>
                      {submitting ? <ActivityIndicator size="small" color={theme.accentText} /> : <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: "600" }}>{i18n("common.save")}</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <SwipeableRow id={rule.id} onDelete={() => handleDeleteRule(rule)} dangerColor={theme.danger}>
                  <TouchableOpacity
                    style={[styles.ruleRow, { backgroundColor: theme.card }]}
                    onPress={() => handleEditRule(rule)}
                    activeOpacity={1}
                  >
                    <View style={styles.ruleInfo}>
                      <Text style={[styles.ruleMatch, { color: theme.text }]}>"{rule.match}"</Text>
                      <View style={styles.ruleArrow}>
                        <Ionicons name="arrow-forward" size={16} color={theme.textSecondary} />
                      </View>
                      <View style={[styles.ruleCatPill, { backgroundColor: theme.accent + "10", borderColor: theme.accent + "30" }]}>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: theme.accent }}>{catName}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
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
    justifyContent: "center",
    padding: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  formContent: { padding: 16, paddingTop: 0 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerOptions: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 8,
    overflow: "hidden",
    maxHeight: 250,
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerOptionText: { flex: 1, fontSize: 15 },
  submitBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 40,
    alignItems: "center",
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 8,
  },
  ruleInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
    flexWrap: "wrap",
  },
  ruleMatch: {
    fontSize: 15,
    fontWeight: "600",
    fontStyle: "italic",
  },
  ruleArrow: {
    paddingHorizontal: 4,
  },
  ruleCatPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
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
