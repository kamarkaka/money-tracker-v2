import { useState, useEffect, useCallback, useRef } from "react";
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
import { getEmojiIcon, DEFAULT_CATEGORY_ICONS, ALL_CATEGORY_ICONS } from "@/lib/emoji";
import { useSubscription } from "@/lib/subscription";
import { SwipeableRow, SwipeableProvider, SwipeableScrollView } from "@/components/SwipeableRow";
import type { Category } from "@money-tracker/shared";

const categoryApi = createCategoryApi(apiClient);

export default function CategoriesPage() {
  const { theme } = useAppTheme();
  const { i18n } = useI18n();
  const { isPro } = useSubscription();
  const iconList = isPro ? ALL_CATEGORY_ICONS : DEFAULT_CATEGORY_ICONS;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const data = await categoryApi.list();
      setCategories(data);
    } catch {
      Alert.alert(i18n("common.error"), "Failed to load categories");
    }
  }, [i18n]);

  useEffect(() => {
    loadCategories().finally(() => setLoading(false));
  }, [loadCategories]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  }, [loadCategories]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert(i18n("common.error"), "Category name is required");
      return;
    }

    // Flatten tree for duplicate check
    const allCats = categories.flatMap((c) => [c, ...(c.children || [])]);
    const duplicate = allCats.some(
      (cat) => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase(),
    );
    if (duplicate) {
      Alert.alert(i18n("common.error"), i18n("category.duplicateError"));
      return;
    }

    setSaving(true);
    try {
      await categoryApi.create({
        name: newCategoryName.trim(),
        parentId: selectedParentId,
        emoji: selectedEmoji || undefined,
      } as any);
      await loadCategories();
      setNewCategoryName("");
      setSelectedParentId(null);
      setSelectedEmoji(null);
      setShowAddForm(false);
    } catch {
      Alert.alert(i18n("common.error"), "Failed to create category");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      i18n("category.deleteCategory"),
      i18n("category.deleteWarning"),
      [
        { text: i18n("common.cancel"), style: "cancel" },
        {
          text: i18n("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await categoryApi.remove(category.id);
              await loadCategories();
            } catch {
              Alert.alert(i18n("common.error"), "Failed to delete category");
            }
          },
        },
      ],
    );
  };

  // categories from API is already a tree — only top-level with children nested
  const topLevelCategories = categories;

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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />
      }
    >
      {/* Add Category Form */}
      <View style={[styles.card, showAddForm ? { backgroundColor: theme.brand + "10", borderColor: theme.brand + "40" } : { backgroundColor: theme.brand, borderColor: theme.brand }]}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setShowAddForm(!showAddForm)}
          activeOpacity={0.7}
        >
          <Text style={[styles.cardTitle, { color: showAddForm ? theme.text : theme.brandText, textAlign: "center", flex: 1 }]}>
            {i18n("category.addCategory")}
          </Text>
        </TouchableOpacity>

        {showAddForm && (
          <View style={styles.formContent}>
            {/* Name */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {i18n("category.categoryName")}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.text }]}
              placeholder={i18n("category.namePlaceholder")}
              placeholderTextColor={theme.textSecondary}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              editable={!saving}
            />

            {/* Icon picker — 3.5 rows visible, scrollable */}
            <ScrollView style={[styles.iconScroll, { marginTop: 12 }]} nestedScrollEnabled>
            <View style={styles.iconGrid}>
              {iconList.map((item) => {
                const isSelected = selectedEmoji === item.emoji;
                return (
                  <TouchableOpacity
                    key={item.emoji}
                    style={[
                      styles.iconBtn,
                      { borderColor: isSelected ? item.icon.color : theme.cardBorder, backgroundColor: theme.card },
                      isSelected && { backgroundColor: item.icon.color + "20", borderColor: item.icon.color },
                    ]}
                    onPress={() => setSelectedEmoji(isSelected ? null : item.emoji)}
                  >
                    <Ionicons
                      name={item.icon.icon}
                      size={26}
                      color={isSelected ? item.icon.color : theme.textSecondary}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
            </ScrollView>

            {/* Parent picker */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>
              {i18n("category.parentOptional")}
            </Text>
            <TouchableOpacity
              style={[styles.picker, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
              onPress={() => setShowParentPicker(!showParentPicker)}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Text style={{ color: theme.text, flex: 1 }}>
                {selectedParentId
                  ? topLevelCategories.find((c) => c.id === selectedParentId)?.name
                  : i18n("category.noneTopLevel")}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            {showParentPicker && (
              <View style={[styles.pickerOptions, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                <TouchableOpacity
                  style={[styles.pickerOption, { borderBottomColor: theme.cardBorder }]}
                  onPress={() => { setSelectedParentId(null); setShowParentPicker(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerOptionText, { color: !selectedParentId ? theme.accent : theme.text, fontWeight: !selectedParentId ? "600" : "400" }]}>
                    {i18n("category.noneTopLevel")}
                  </Text>
                  {!selectedParentId && <Ionicons name="checkmark" size={20} color={theme.accent} />}
                </TouchableOpacity>
                {topLevelCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.pickerOption, { borderBottomColor: theme.cardBorder }]}
                    onPress={() => { setSelectedParentId(cat.id); setShowParentPicker(false); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={getEmojiIcon(cat.emoji).icon} size={18} color={getEmojiIcon(cat.emoji).color} style={{ marginRight: 8 }} />
                    <Text style={[styles.pickerOptionText, { color: selectedParentId === cat.id ? theme.accent : theme.text, fontWeight: selectedParentId === cat.id ? "600" : "400" }]}>
                      {cat.name}
                    </Text>
                    {selectedParentId === cat.id && <Ionicons name="checkmark" size={20} color={theme.accent} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.accent, opacity: saving || !newCategoryName.trim() ? 0.5 : 1 }]}
              onPress={handleAddCategory}
              disabled={saving || !newCategoryName.trim()}
              activeOpacity={0.7}
            >
              {saving ? (
                <ActivityIndicator size="small" color={theme.accentText} />
              ) : (
                <Text style={[styles.addButtonText, { color: theme.accentText }]}>{i18n("common.add")}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Category Tree */}
      {topLevelCategories.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="bookmark-outline" size={48} color={theme.textSecondary} />
          <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text, marginTop: 16 }}>{i18n("category.noCategories")}</Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: "center", marginTop: 8 }}>{i18n("category.noCategoriesDesc")}</Text>
        </View>
      ) : (
        topLevelCategories.map((parent) => {
          const children = parent.children || [];
          const emojiIcon = getEmojiIcon(parent.emoji);
          const isExpanded = expandedParentId === parent.id;
          const hasChildren = children.length > 0;

          return (
            <View
              key={parent.id}
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder, overflow: "hidden" }]}
            >
              {/* Parent row — swipeable */}
              <SwipeableRow
                id={parent.id}
                onDelete={() => handleDeleteCategory(parent)}
                dangerColor={theme.danger}
              >
                <TouchableOpacity
                  style={[styles.categoryHeader, { backgroundColor: theme.card }]}
                  onPress={() => hasChildren && setExpandedParentId(isExpanded ? null : parent.id)}
                  activeOpacity={1}
                >
                  <View style={styles.categoryInfo}>
                    {hasChildren && (
                      <Ionicons
                        name={isExpanded ? "chevron-down" : "chevron-forward"}
                        size={18}
                        color={theme.textSecondary}
                        style={{ marginRight: 6 }}
                      />
                    )}
                    <Ionicons
                      name={emojiIcon.icon}
                      size={24}
                      color={emojiIcon.color}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.categoryName, { color: theme.text }]}>
                      {parent.name}
                    </Text>
                    {hasChildren && (
                      <Text style={{ color: theme.textSecondary, fontSize: 13, marginLeft: 6 }}>
                        ({children.length})
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </SwipeableRow>

              {/* Children — shown when expanded */}
              {isExpanded && children.length > 0 && (
                <View style={[styles.childrenContainer, { borderTopColor: theme.cardBorder }]}>
                  {children.map((child) => {
                    const childIcon = getEmojiIcon(child.emoji);
                    return (
                      <SwipeableRow
                        key={child.id}
                        id={child.id}
                        onDelete={() => handleDeleteCategory(child)}
                        dangerColor={theme.danger}
                      >
                        <View style={[styles.childRow, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}>
                          <View style={styles.childInfo}>
                            <Ionicons
                              name={childIcon.icon}
                              size={18}
                              color={childIcon.color}
                              style={{ marginRight: 8 }}
                            />
                            <Text style={[styles.childName, { color: theme.text }]}>
                              {child.name}
                            </Text>
                          </View>
                        </View>
                      </SwipeableRow>
                    );
                  })}
                </View>
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
    padding: 0,
    marginBottom: 16,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  formContent: { paddingHorizontal: 16, paddingBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  iconScroll: {
    maxHeight: 210,
    marginBottom: 8,
  },
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
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerOptionText: { flex: 1, fontSize: 15 },
  addButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  addButtonText: { fontSize: 16, fontWeight: "600" },
  emptyState: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 40,
    alignItems: "center",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  categoryInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  categoryName: { fontSize: 17, fontWeight: "600" },
  childrenContainer: { borderTopWidth: StyleSheet.hairlineWidth },
  childRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingLeft: 48,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  childInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  childName: { fontSize: 17, fontWeight: "500" },
});
