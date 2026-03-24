import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Animated,
  TouchableWithoutFeedback,
  Keyboard,
  useWindowDimensions,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { createTransactionApi, createAccountApi } from "@money-tracker/api-client";
import type { Account, Transaction } from "@money-tracker/shared";
import { parseAmount } from "@money-tracker/shared";
import { apiClient } from "@/lib/api";
import { getDatabase } from "@/lib/db";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";
import { DEFAULT_CATEGORY_ICONS, getEmojiIcon } from "@/lib/emoji";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const txApi = createTransactionApi(apiClient);
const accApi = createAccountApi(apiClient);

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
  const { theme, isDark } = useAppTheme();
  const { i18n, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const categoryScrollRef = useRef<ScrollView>(null);
  const amountRef = useRef<TextInput>(null);
  const keyboardOpenRef = useRef(false);
  const dismissedAddRef = useRef(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [rawCents, setRawCents] = useState("");

  const displayAmount = rawCents
    ? (parseInt(rawCents, 10) / 100).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "";

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "").replace(/^0+/, "") || "";
    // Cap at $100 million (10 digits of cents)
    if (digits.length > 10) return;
    setRawCents(digits);
  };
  const [isExpense, setIsExpense] = useState(true);
  const [date, setDate] = useState(new Date());
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState(new Date());

  useEffect(() => {
    if (open) {
      setShowDatePicker(false);
      setSaving(false);

      if (editTransaction) {
        const amt = parseAmount(editTransaction.amount);
        setRawCents(String(Math.round(Math.abs(amt) * 100)));
        setIsExpense(amt < 0);
        setDescription(editTransaction.description || "");
        setDate(new Date(editTransaction.date));
        setSelectedEmoji(editTransaction.category?.emoji || null);
        setAccountId(editTransaction.account?.id || "");
        dismissedAddRef.current = false;
      } else if (!dismissedAddRef.current) {
        // Fresh add — reset all fields
        setRawCents("");
        setDescription("");
        setDate(new Date());
        setSelectedEmoji(null);
        setIsExpense(true);
      }
      // else: resuming a dismissed add — keep existing state

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
        Animated.timing(slideAnim, { toValue: screenHeight, duration: 300, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [open, editTransaction]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardWillShow", (e) => {
      keyboardOpenRef.current = true;
      const offset = Math.min(e.endCoordinates.height * 0.5, 200);
      Animated.timing(keyboardOffset, {
        toValue: -offset,
        duration: e.duration || 250,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener("keyboardWillHide", (e) => {
      keyboardOpenRef.current = false;
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: e.duration || 250,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleClose = () => {
    dismissedAddRef.current = false;
    onClose();
  };

  const handleBackdropTap = () => {
    // If keyboard is open, just dismiss it
    if (keyboardOpenRef.current) {
      Keyboard.dismiss();
      return;
    }
    if (isEdit) {
      // Editing: discard changes, close
      onClose();
    } else {
      // Adding: preserve state for next + tap
      dismissedAddRef.current = true;
      onClose();
    }
  };

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    if (selectedDate) setPendingDate(selectedDate);
  };

  const confirmDate = () => {
    setDate(pendingDate);
    setShowDatePicker(false);
  };

  const openDatePicker = () => {
    setPendingDate(date);
    setShowDatePicker(!showDatePicker);
  };

  const handleSave = async () => {
    if (!accountId) { Alert.alert(i18n("common.error"), i18n("transaction.accountRequired")); return; }
    const cents = parseInt(rawCents, 10);
    if (!cents || cents <= 0) { Alert.alert(i18n("common.error"), i18n("transaction.amountRequired")); return; }
    const parsed = cents / 100;

    setSaving(true);
    try {
      const finalAmount = isExpense ? -Math.abs(parsed) : Math.abs(parsed);
      if (isEdit && editTransaction) {
        // Resolve emoji to categoryId if changed
        let categoryId: string | null | undefined;
        if (selectedEmoji !== (editTransaction.category?.emoji || null)) {
          if (selectedEmoji) {
            const db = await getDatabase();
            const cat = await db.getFirstAsync<{ id: string }>(
              "SELECT id FROM categories WHERE emoji = ?",
              [selectedEmoji],
            );
            categoryId = cat?.id || null;
          } else {
            categoryId = null;
          }
        }
        await txApi.update(editTransaction.id, {
          description: description.trim() || "Transaction",
          amount: finalAmount,
          date: date.toISOString().split("T")[0],
          ...(categoryId !== undefined ? { categoryId } : {}),
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
      dismissedAddRef.current = false;
      onComplete?.();
      handleClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : i18n("common.error");
      Alert.alert(i18n("common.error"), msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editTransaction) return;
    Alert.alert(i18n("transaction.deleteTransaction"), i18n("transaction.deleteWarning"), [
      { text: i18n("common.cancel"), style: "cancel" },
      {
        text: i18n("common.delete"),
        style: "destructive",
        onPress: async () => {
          setSaving(true);
          try {
            await txApi.remove(editTransaction.id);
            onComplete?.();
            handleClose();
          } catch {
            Alert.alert(i18n("common.error"), i18n("common.error"));
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const dateLabel = date.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const amountColor = isExpense ? theme.expense : theme.income;

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
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.backdrop, opacity: backdropAnim, zIndex: 90 }]}
      >
        <TouchableWithoutFeedback onPress={handleBackdropTap}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      <Animated.View style={[
        styles.modal,
        { backgroundColor: theme.card, shadowColor: theme.shadow, transform: [{ translateY: slideAnim }, { translateY: keyboardOffset }], zIndex: 100 },
      ]}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.content, { paddingBottom: insets.bottom + 80 }]}>
          {/* Date */}
          <View style={styles.dateRow}>
            <Text style={[styles.dateText, { color: theme.text }]}>{dateLabel}</Text>
            <TouchableOpacity
              onPress={openDatePicker}
              style={[styles.calendarBtn, { backgroundColor: theme.cardBorder + "30" }]}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.brand} />
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <View style={[styles.datePickerOverlay, { backgroundColor: theme.card, borderColor: theme.cardBorder, shadowColor: theme.shadow }]}>
              <DateTimePicker
                value={pendingDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onValueChange={handleDateChange}
                themeVariant={isDark ? "dark" : "light"}
              />
              <TouchableOpacity style={styles.dateConfirmBtn} onPress={confirmDate} activeOpacity={0.7}>
                <Ionicons name="checkmark-circle" size={36} color={theme.brand} />
              </TouchableOpacity>
            </View>
          )}

          {/* Toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, isExpense && { backgroundColor: theme.expenseBg }]}
              onPress={() => setIsExpense(true)}
            >
              <Text style={{ color: isExpense ? theme.expense : theme.textSecondary, fontWeight: "600" }}>{i18n("transaction.expense")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !isExpense && { backgroundColor: theme.incomeBg }]}
              onPress={() => setIsExpense(false)}
            >
              <Text style={{ color: !isExpense ? theme.income : theme.textSecondary, fontWeight: "600" }}>{i18n("transaction.income")}</Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <TouchableWithoutFeedback onPress={() => amountRef.current?.focus()}>
            <View style={[styles.amountRow, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
              <Text style={[styles.amountCurrency, { color: displayAmount ? amountColor : theme.textSecondary }]}>$</Text>
              <Text style={[styles.amountDisplay, { color: displayAmount ? amountColor : theme.textSecondary }]}>
                {displayAmount || "0.00"}
              </Text>
            </View>
          </TouchableWithoutFeedback>
          <TextInput
            ref={amountRef}
            style={styles.amountHiddenInput}
            value={rawCents}
            onChangeText={handleAmountChange}
            keyboardType="number-pad"
            caretHidden
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
          {selectedEmoji && (
            <Text style={{ textAlign: "center", fontSize: 15, fontWeight: "600", color: theme.textSecondary, marginBottom: 12 }}>
              {i18n(getEmojiIcon(selectedEmoji).i18nKey)}
            </Text>
          )}

          {/* Description */}
          <TextInput
            style={[styles.textArea, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.cardBorder }]}
            placeholder={i18n("transaction.descriptionOptional")}
            placeholderTextColor={theme.textSecondary}
            value={description}
            onChangeText={setDescription}
            returnKeyType="done"
            blurOnSubmit
            textAlignVertical="top"
          />

          {/* Action buttons */}
          <View style={styles.actionRow}>
            {isEdit && (
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: theme.dangerBg }]}
                onPress={handleDelete}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={22} color={theme.danger} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveButton, { opacity: saving ? 0.6 : 1, flex: 1, backgroundColor: theme.brand }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={[styles.saveButtonText, { color: theme.brandText }]}>
                {saving ? i18n("common.saving") : isEdit ? i18n("common.saveChanges") : i18n("transaction.addTransaction")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </TouchableWithoutFeedback>
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
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  content: { paddingHorizontal: 20, paddingTop: 16 },
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
  datePickerOverlay: {
    position: "absolute",
    top: 50,
    left: 40,
    right: 40,
    borderWidth: 1,
    borderRadius: 16,
    paddingBottom: 8,
    zIndex: 200,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  dateConfirmBtn: {
    alignSelf: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  toggleRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16 },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  amountRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 16, borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16 },
  amountCurrency: { fontSize: 44, fontWeight: "800", marginRight: 2 },
  amountDisplay: { fontSize: 44, fontWeight: "800" },
  amountHiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0 },
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
    justifyContent: "center",
    alignItems: "center",
  },
  saveButton: {
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: { fontSize: 17, fontWeight: "700" },
});
