import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  useColorScheme,
  Platform,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { createTransactionApi, createAccountApi } from "@money-tracker/api-client";
import type { Account, Transaction } from "@money-tracker/shared";
import { parseAmount } from "@money-tracker/shared";
import { apiClient } from "@/lib/api";
import { colors } from "@/lib/theme";
import { DEFAULT_CATEGORY_ICONS } from "@/lib/emoji";

const SCREEN_HEIGHT = Dimensions.get("window").height;

const ICONS_ROW_1 = DEFAULT_CATEGORY_ICONS.slice(0, Math.ceil(DEFAULT_CATEGORY_ICONS.length / 2));
const ICONS_ROW_2 = DEFAULT_CATEGORY_ICONS.slice(Math.ceil(DEFAULT_CATEGORY_ICONS.length / 2));

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  editTransaction?: Transaction | null;
}

export function TransactionModal({ open, onClose, onComplete, editTransaction }: Props) {
  const isEdit = !!editTransaction;
  const scheme = useColorScheme();
  const theme = colors[scheme === "dark" ? "dark" : "light"];
  const txApi = createTransactionApi(apiClient);
  const accApi = createAccountApi(apiClient);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const categoryScrollRef = useRef<ScrollView>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isExpense, setIsExpense] = useState(true);
  const [date, setDate] = useState(new Date());
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (open) {
      setShowDatePicker(false);
      setSaving(false);

      if (editTransaction) {
        const amt = parseAmount(editTransaction.amount);
        setAmount(String(Math.abs(amt)));
        setIsExpense(amt < 0);
        setDescription(editTransaction.description || "");
        setDate(new Date(editTransaction.date));
        setSelectedEmoji(editTransaction.category?.emoji || null);
        setAccountId(editTransaction.account?.id || "");
      } else {
        setAmount("");
        setDescription("");
        setDate(new Date());
        setSelectedEmoji(null);
        setIsExpense(true);
      }

      accApi.list().then((accs) => {
        setAccounts(accs);
        if (accs.length > 0 && !editTransaction?.account?.id && !accountId) {
          setAccountId(accs[0].id);
        }
      });

      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start(() => {
        // Scroll category list to the selected emoji
        const emojiToFind = editTransaction?.category?.emoji;
        if (emojiToFind && categoryScrollRef.current) {
          const colIndex = ICONS_ROW_1.findIndex((item) => item.emoji === emojiToFind);
          const colIndex2 = ICONS_ROW_2.findIndex((item) => item.emoji === emojiToFind);
          const idx = colIndex >= 0 ? colIndex : colIndex2 >= 0 ? colIndex2 : -1;
          if (idx >= 0) {
            const COL_WIDTH = 64; // 56 btn + 8 margin
            categoryScrollRef.current.scrollTo({ x: Math.max(0, idx * COL_WIDTH - 40), animated: true });
          }
        }
      });
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 300, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [open, editTransaction]);

  const handleClose = () => onClose();

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const handleSave = async () => {
    if (!accountId) { Alert.alert("Error", "Please select an account"); return; }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { Alert.alert("Error", "Please enter a valid amount"); return; }

    setSaving(true);
    try {
      const finalAmount = isExpense ? -Math.abs(parsed) : Math.abs(parsed);
      if (isEdit && editTransaction) {
        await txApi.update(editTransaction.id, {
          description: description.trim() || "Transaction",
          amount: finalAmount,
          date: date.toISOString().split("T")[0],
        });
      } else {
        await txApi.create({
          accountId,
          description: description.trim() || "Transaction",
          amount: finalAmount,
          date: date.toISOString().split("T")[0],
          emoji: selectedEmoji || undefined,
        });
      }
      onComplete?.();
      handleClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editTransaction) return;
    Alert.alert("Delete Transaction", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setSaving(true);
          try {
            await txApi.remove(editTransaction.id);
            onComplete?.();
            handleClose();
          } catch {
            Alert.alert("Error", "Failed to delete");
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const amountColor = isExpense ? "#dc2626" : "#16a34a";

  function renderCategoryBtn(item: (typeof ICONS_ROW_1)[number]) {
    const isSelected = selectedEmoji === item.emoji;
    return (
      <TouchableOpacity
        key={item.emoji}
        style={[
          styles.categoryBtn,
          { borderColor: isSelected ? item.icon.color : theme.cardBorder },
          isSelected && { backgroundColor: item.icon.color + "20" },
        ]}
        onPress={() => setSelectedEmoji(isSelected ? null : item.emoji)}
      >
        <Ionicons name={item.icon.icon} size={26} color={isSelected ? item.icon.color : theme.textSecondary} />
      </TouchableOpacity>
    );
  }

  return (
    <>
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)", opacity: backdropAnim, zIndex: 90 }]}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      <Animated.View style={[
        styles.modal,
        { backgroundColor: theme.card, transform: [{ translateY: slideAnim }], zIndex: 100 },
      ]}>
        <View style={styles.content}>
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: theme.cardBorder }]} />
          </View>

          {/* Date */}
          <View style={styles.dateRow}>
            <Text style={[styles.dateText, { color: theme.text }]}>{dateLabel}</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(!showDatePicker)}
              style={[styles.calendarBtn, { backgroundColor: theme.cardBorder + "30" }]}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.accent} />
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
              themeVariant={scheme === "dark" ? "dark" : "light"}
            />
          )}

          {/* Toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, isExpense && { backgroundColor: "#fee2e2" }]}
              onPress={() => setIsExpense(true)}
            >
              <Text style={{ color: isExpense ? "#dc2626" : theme.textSecondary, fontWeight: "600" }}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !isExpense && { backgroundColor: "#dcfce7" }]}
              onPress={() => setIsExpense(false)}
            >
              <Text style={{ color: !isExpense ? "#16a34a" : theme.textSecondary, fontWeight: "600" }}>Income</Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <TextInput
            style={[styles.amountInput, { color: amountColor }]}
            placeholder="0.00"
            placeholderTextColor={theme.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />

          {/* Category */}
          <ScrollView ref={categoryScrollRef} horizontal showsHorizontalScrollIndicator={false} style={styles.categorySection}>
            {ICONS_ROW_1.map((item, i) => (
              <View key={item.emoji} style={styles.categoryCol}>
                {renderCategoryBtn(item)}
                {ICONS_ROW_2[i] && renderCategoryBtn(ICONS_ROW_2[i])}
              </View>
            ))}
          </ScrollView>

          {/* Description */}
          <TextInput
            style={[styles.textArea, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.cardBorder }]}
            placeholder="What was this for?"
            placeholderTextColor={theme.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />

          {/* Action buttons */}
          <View style={styles.actionRow}>
            {isEdit && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveButton, { opacity: saving ? 0.6 : 1, flex: 1 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>
                {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Transaction"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  modal: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  content: { paddingHorizontal: 20, paddingBottom: 112 },
  handleBar: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 16,
  },
  dateText: { fontSize: 18, fontWeight: "600" },
  calendarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16 },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  amountInput: { fontSize: 44, fontWeight: "800", textAlign: "center", width: "100%", marginBottom: 16 },
  categorySection: { marginBottom: 16 },
  categoryCol: { gap: 8, marginRight: 8 },
  categoryBtn: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  textArea: {
    height: 64,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  deleteBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
  },
  saveButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: { color: "#ffffff", fontSize: 17, fontWeight: "700" },
});
