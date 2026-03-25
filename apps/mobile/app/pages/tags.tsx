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
import { createTagApi } from "@money-tracker/api-client";
import { apiClient } from "@/lib/api";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";
import { randomTagColor } from "@money-tracker/shared";
import { SwipeableRow, SwipeableProvider } from "@/components/SwipeableRow";
import type { Tag } from "@money-tracker/shared";

const tagApi = createTagApi(apiClient);

export default function TagsPage() {
  const { theme } = useAppTheme();
  const { i18n } = useI18n();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => { loadTags(); }, []);

  const loadTags = async () => {
    try {
      const data = await tagApi.list();
      setTags(data);
    } catch {
      Alert.alert(i18n("common.error"), "Failed to load tags");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => { setRefreshing(true); loadTags(); };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    setAdding(true);
    try {
      const newTag = await tagApi.create({ name: newTagName.trim(), color: randomTagColor() });
      setTags([...tags, newTag]);
      setNewTagName("");
      setShowAddForm(false);
    } catch {
      Alert.alert(i18n("common.error"), "Failed to add tag");
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) { setEditingId(null); return; }
    try {
      const updated = await tagApi.update(id, { name: editingName.trim() });
      setTags(tags.map((t) => (t.id === id ? updated : t)));
      setEditingId(null);
    } catch {
      Alert.alert(i18n("common.error"), "Failed to update tag");
    }
  };

  const handleDeleteTag = (tag: Tag) => {
    Alert.alert(i18n("tag.deleteTag"), i18n("tag.deleteWarning"), [
      { text: i18n("common.cancel"), style: "cancel" },
      {
        text: i18n("common.delete"), style: "destructive",
        onPress: async () => {
          try { await tagApi.remove(tag.id); setTags(tags.filter((t) => t.id !== tag.id)); }
          catch { Alert.alert(i18n("common.error"), "Failed to delete tag"); }
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

  return (
    <SwipeableProvider>
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
    >
      {/* Add Tag Button */}
      <View style={[styles.card, showAddForm ? { backgroundColor: theme.brand + "10", borderColor: theme.brand + "40" } : { backgroundColor: theme.brand, borderColor: theme.brand }]}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => { setShowAddForm(!showAddForm); if (showAddForm) setNewTagName(""); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.cardTitle, { color: showAddForm ? theme.text : theme.brandText, textAlign: "center", flex: 1 }]}>
            {i18n("tag.addTag")}
          </Text>
        </TouchableOpacity>

        {showAddForm && (
          <View style={styles.formContent}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{i18n("tag.tagName")}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.text }]}
              placeholder={i18n("tag.namePlaceholder")}
              placeholderTextColor={theme.textSecondary}
              value={newTagName}
              onChangeText={setNewTagName}
              onSubmitEditing={handleAddTag}
              returnKeyType="done"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.accent, opacity: !newTagName.trim() || adding ? 0.5 : 1 }]}
              onPress={handleAddTag}
              disabled={!newTagName.trim() || adding}
              activeOpacity={0.7}
            >
              {adding ? (
                <ActivityIndicator size="small" color={theme.accentText} />
              ) : (
                <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: "600" }}>{i18n("common.add")}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Tag List */}
      {tags.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="pricetag-outline" size={48} color={theme.textSecondary} />
          <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text, marginTop: 16 }}>{i18n("tag.noTags")}</Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: "center", marginTop: 8 }}>{i18n("tag.noTagsDesc")}</Text>
        </View>
      ) : (
        tags.map((tag) => {
          const isEditing = editingId === tag.id;
          return (
            <View key={tag.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <SwipeableRow id={tag.id} onDelete={() => handleDeleteTag(tag)} dangerColor={theme.danger}>
                <TouchableOpacity
                  style={[styles.tagRow, { backgroundColor: theme.card }]}
                  onPress={() => { setEditingId(tag.id); setEditingName(tag.name); }}
                  activeOpacity={1}
                >
                  <View style={[styles.colorBar, { backgroundColor: tag.color }]} />
                  {isEditing ? (
                    <View style={styles.editRow}>
                      <TextInput
                        style={[styles.editInput, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.text }]}
                        value={editingName}
                        onChangeText={setEditingName}
                        autoFocus
                        onSubmitEditing={() => handleSaveEdit(tag.id)}
                        returnKeyType="done"
                      />
                      <TouchableOpacity onPress={() => handleSaveEdit(tag.id)} style={styles.editBtn}>
                        <Ionicons name="checkmark" size={22} color={theme.brand} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingId(null)} style={styles.editBtn}>
                        <Ionicons name="close" size={22} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.tagInfo}>
                      <Text style={[styles.tagName, { color: theme.text }]}>{tag.name}</Text>
                      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                    </View>
                  )}
                </TouchableOpacity>
              </SwipeableRow>
            </View>
          );
        })
      )}
    </ScrollView>
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
  formContent: { paddingHorizontal: 16, paddingBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
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
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  colorBar: {
    width: 4,
    borderRadius: 2,
    alignSelf: "stretch",
    marginRight: 12,
  },
  tagInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  tagName: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  editBtn: {
    padding: 4,
  },
});
