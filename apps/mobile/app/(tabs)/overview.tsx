import { useEffect, useState, useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createTransactionApi, createCategoryApi } from "@money-tracker/api-client";
import { formatCurrency, parseAmount } from "@money-tracker/shared";
import type { Transaction, Category } from "@money-tracker/shared";
import { apiClient } from "@/lib/api";
import { useAppTheme } from "@/lib/themeContext";
import { FALLBACK_EMOJI, getEmojiIcon } from "@/lib/emoji";
import { useTransactionModal } from "@/lib/addModal";
import { SlotNumber } from "@/components/SlotNumber";
import { useI18n } from "@/lib/i18n";

const RING_COLORS = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
  "#f43f5e", "#14b8a6", "#f97316", "#6366f1",
  "#ec4899", "#06b6d4",
];

interface EmojiGroup {
  emoji: string;
  name: string;
  total: number;
  transactions: Transaction[];
}

function getShortMonths(locale: string): string[] {
  return Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(2000, i, 1))
  );
}

function addMonths(y: number, m: number, delta: number): { y: number; m: number } {
  let newM = m + delta;
  let newY = y;
  while (newM > 11) { newM -= 12; newY += 1; }
  while (newM < 0) { newM += 12; newY -= 1; }
  return { y: newY, m: newM };
}

// Pure View-based circular progress ring
function ProgressRing({ size, strokeWidth, pct, ringColor, trackColor, children }: {
  size: number;
  strokeWidth: number;
  pct: number;
  ringColor: string;
  trackColor: string;
  children: React.ReactNode;
}) {
  const radius = size / 2;
  const clampedPct = Math.min(Math.max(pct, 0), 1);
  const degrees = clampedPct * 360;

  return (
    <View style={{ width: size, height: size }}>
      <View style={{
        position: "absolute", width: size, height: size,
        borderRadius: radius, borderWidth: strokeWidth, borderColor: trackColor,
      }} />
      {clampedPct > 0 && (
        <View style={{ position: "absolute", width: size, height: size }}>
          <View style={{ position: "absolute", width: size, height: size, overflow: "hidden" }}>
            <View style={{ position: "absolute", width: size / 2, height: size, left: size / 2, overflow: "hidden" }}>
              <View style={{
                width: size, height: size, left: -(size / 2),
                borderRadius: radius, borderWidth: strokeWidth, borderColor: ringColor,
                transform: [{ rotate: `${Math.min(degrees, 180)}deg` }],
              }} />
            </View>
          </View>
          {degrees > 180 && (
            <View style={{ position: "absolute", width: size, height: size, overflow: "hidden" }}>
              <View style={{ position: "absolute", width: size / 2, height: size, left: 0, overflow: "hidden" }}>
                <View style={{
                  width: size, height: size,
                  borderRadius: radius, borderWidth: strokeWidth, borderColor: ringColor,
                  transform: [{ rotate: `${degrees}deg` }],
                }} />
              </View>
            </View>
          )}
        </View>
      )}
      <View style={{
        position: "absolute", width: size, height: size,
        justifyContent: "center", alignItems: "center",
      }}>
        {children}
      </View>
    </View>
  );
}

export default function OverviewScreen() {
  const { theme, isDark } = useAppTheme();
  const { i18n, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const txApi = createTransactionApi(apiClient);
  const catApi = createCategoryApi(apiClient);

  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedEmoji, setExpandedEmoji] = useState<string | null>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);
  const { openEdit, setOnComplete } = useTransactionModal();
  const [earliestDate, setEarliestDate] = useState<{ y: number; m: number } | null>(null);

  const handleMonthScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setShowLeftFade(contentOffset.x > 10);
    setShowRightFade(contentOffset.x < contentSize.width - layoutMeasurement.width - 10);
  };

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const monthScrollRef = useRef<ScrollView>(null);

  const refreshEarliestDate = useCallback(() => {
    txApi.list({ pageSize: 1, sortBy: "date", sortOrder: "asc" }).then((res) => {
      if (res.transactions.length > 0) {
        const d = new Date(res.transactions[0].date);
        setEarliestDate({ y: d.getFullYear(), m: d.getMonth() });
      }
    });
  }, []);

  // Fetch the earliest transaction date to determine month picker range
  useEffect(() => {
    refreshEarliestDate();
  }, [refreshEarliestDate]);

  const shortMonths = getShortMonths(locale);

  const fetchData = useCallback(async () => {
    const startDate = new Date(year, month, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

    const [txData, catData] = await Promise.all([
      txApi.list({ startDate, endDate, pageSize: 0 }),
      catApi.list(),
    ]);

    setTransactions(txData.transactions);
    setCategories(catData);
    refreshEarliestDate();
  }, [year, month, refreshEarliestDate]);

  useEffect(() => {
    fetchData().finally(() => {
      if (initialLoad) setInitialLoad(false);
    });
  }, [fetchData]);

  // Re-fetch when tab gains focus (e.g. after import in settings)
  useFocusEffect(
    useCallback(() => {
      if (!initialLoad) fetchData();
    }, [fetchData, initialLoad]),
  );

  // Register fetchData so the transaction modal refreshes data after save/delete
  useEffect(() => {
    setOnComplete(() => fetchData);
  }, [fetchData, setOnComplete]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Build month pills from current month back to earliest transaction (min 12 months)
  const monthPills: { y: number; m: number }[] = [];
  {
    const endY = now.getFullYear();
    const endM = now.getMonth();
    let minMonths = 12;
    if (earliestDate) {
      const totalMonths = (endY - earliestDate.y) * 12 + (endM - earliestDate.m) + 1;
      if (totalMonths > minMonths) minMonths = totalMonths;
    }
    for (let i = 0; i < minMonths; i++) {
      monthPills.push(addMonths(endY, endM, -i));
    }
  }

  // Group transactions by emoji
  const groupMap = new Map<string, EmojiGroup>();
  for (const t of transactions) {
    const rawEmoji = t.category?.emoji;
    const emoji = rawEmoji && rawEmoji.length > 0 ? rawEmoji : FALLBACK_EMOJI;
    const name = t.category?.name || i18n("overview.others");
    if (!groupMap.has(emoji)) {
      groupMap.set(emoji, { emoji, name, total: 0, transactions: [] });
    }
    const g = groupMap.get(emoji)!;
    g.total += parseAmount(t.amount);
    g.transactions.push(t);
  }
  const groups = Array.from(groupMap.values()).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

  // Totals
  const transferCat = categories.find((c) => !c.parentId && c.name.toLowerCase() === "transfer");
  const transferIds = new Set<string>();
  if (transferCat) {
    transferIds.add(transferCat.id);
    transferCat.children?.forEach((ch) => transferIds.add(ch.id));
  }
  const nonTransfer = transactions.filter((t) => !t.categoryId || !transferIds.has(t.categoryId));
  const totalIncome = nonTransfer.filter((t) => parseAmount(t.amount) > 0).reduce((s, t) => s + parseAmount(t.amount), 0);
  const totalExpenses = nonTransfer.filter((t) => parseAmount(t.amount) < 0).reduce((s, t) => s + parseAmount(t.amount), 0);
  const netSavings = totalIncome + totalExpenses;

  if (initialLoad) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const labeledYears = new Set<number>();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
    >
      {/* Month picker */}
      <View style={styles.monthPickerContainer}>
        <ScrollView
          ref={monthScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthRow}
          onScroll={handleMonthScroll}
          scrollEventThrottle={16}
        >
          {monthPills.map(({ y, m }) => {
            const isSelected = y === year && m === month;
            const showYear = !labeledYears.has(y);
            if (showYear) labeledYears.add(y);

            return (
              <TouchableOpacity
                key={`${y}-${m}`}
                onPress={() => { setYear(y); setMonth(m); setExpandedEmoji(null); }}
                style={[styles.monthPill, isSelected && { backgroundColor: "#10b981" }]}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.monthPillText,
                  { color: isSelected ? "#ffffff" : theme.textSecondary },
                  isSelected && { fontWeight: "700" },
                ]}>
                  {shortMonths[m]}
                  {showYear ? ` ${y}` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {showLeftFade && (
          <LinearGradient
            colors={[theme.background, theme.background + "00"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fade, styles.fadeLeft]}
            pointerEvents="none"
          />
        )}
        {showRightFade && (
          <>
            <LinearGradient
              colors={[theme.background + "00", theme.background]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fade, styles.fadeRight]}
              pointerEvents="none"
            />
            <View style={styles.scrollHint} pointerEvents="none">
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </View>
          </>
        )}
      </View>

      {/* Summary cards */}
      <View style={[styles.summaryFull, {
        backgroundColor: netSavings >= 0
          ? (isDark ? "#1e3a5f" : "#eff6ff")
          : (isDark ? "#4c1d1d" : "#fef2f2"),
        borderColor: netSavings >= 0
          ? (isDark ? "#1e40af" : "#bfdbfe")
          : (isDark ? "#991b1b" : "#fecaca"),
      }]}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: netSavings >= 0 ? (isDark ? "#93c5fd" : "#1d4ed8") : (isDark ? "#fca5a5" : "#b91c1c") }}>
          {i18n("overview.netSavings")}
        </Text>
        <View style={{ marginTop: 2 }}>
          <SlotNumber
            value={formatCurrency(netSavings, "USD", true)}
            style={{ fontSize: 28, fontWeight: "800", color: netSavings >= 0 ? (isDark ? "#60a5fa" : "#2563eb") : (isDark ? "#f87171" : "#dc2626") }}
          />
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryHalf, {
          backgroundColor: isDark ? "#064e3b" : "#ecfdf5",
          borderColor: isDark ? "#065f46" : "#a7f3d0",
        }]}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: isDark ? "#6ee7b7" : "#047857" }}>{i18n("overview.totalIncome")}</Text>
          <View style={{ marginTop: 2 }}>
            <SlotNumber
              value={formatCurrency(totalIncome, "USD", true)}
              style={{ fontSize: 20, fontWeight: "800", color: isDark ? "#34d399" : "#059669" }}
            />
          </View>
        </View>
        <View style={[styles.summaryHalf, {
          backgroundColor: isDark ? "#4c1d1d" : "#fef2f2",
          borderColor: isDark ? "#991b1b" : "#fecaca",
        }]}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: isDark ? "#fca5a5" : "#b91c1c" }}>{i18n("overview.totalExpenses")}</Text>
          <View style={{ marginTop: 2 }}>
            <SlotNumber
              value={formatCurrency(Math.abs(totalExpenses), "USD", true)}
              style={{ fontSize: 20, fontWeight: "800", color: isDark ? "#f87171" : "#dc2626" }}
            />
          </View>
        </View>
      </View>

      {/* Category grid */}
      {groups.length === 0 ? (
        <Text style={{ color: theme.textSecondary, textAlign: "center", marginTop: 40, fontSize: 14 }}>
          {i18n("overview.noTransactions")}
        </Text>
      ) : (
        <View style={{ marginTop: 8 }}>
          {Array.from({ length: Math.ceil(groups.length / 4) }).map((_, rowIdx) => {
            const rowGroups = groups.slice(rowIdx * 4, rowIdx * 4 + 4);
            const expandedInRow = rowGroups.find((g) => g.emoji === expandedEmoji);

            return (
              <View key={rowIdx}>
                <View style={styles.emojiRow}>
                  {rowGroups.map((group) => {
                    const index = groups.indexOf(group);
                    const absTotal = Math.abs(group.total);
                    const isIncome = group.total > 0;
                    const base = isIncome ? totalIncome : Math.abs(totalExpenses);
                    const pct = base > 0 ? Math.min(absTotal / base, 1) : 0;
                    const ringColor = RING_COLORS[index % RING_COLORS.length];
                    const isExpanded = expandedEmoji === group.emoji;
                    const iconInfo = getEmojiIcon(group.emoji);

                    return (
                      <TouchableOpacity
                        key={group.emoji}
                        style={[styles.emojiCell, isExpanded && { backgroundColor: theme.cardBorder + "40" }]}
                        onPress={() => setExpandedEmoji(isExpanded ? null : group.emoji)}
                        activeOpacity={0.7}
                      >
                        <ProgressRing
                          size={68}
                          strokeWidth={4}
                          pct={pct}
                          ringColor={ringColor}
                          trackColor={theme.cardBorder}
                        >
                          <Ionicons name={iconInfo.icon} size={28} color={ringColor} />
                        </ProgressRing>
                        <Text style={{ fontSize: 11, color: ringColor, marginTop: 4 }} numberOfLines={1}>
                          {i18n(iconInfo.i18nKey)}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: ringColor }}>
                          {formatCurrency(Math.round(absTotal), "USD", true)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {Array.from({ length: 4 - rowGroups.length }).map((_, i) => (
                    <View key={`empty-${i}`} style={styles.emojiCell} />
                  ))}
                </View>

                {/* Expanded transaction list */}
                {expandedInRow && (
                  <View style={[styles.expandedCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    {expandedInRow.transactions.map((t, i) => {
                      const txColor = RING_COLORS[groups.indexOf(expandedInRow) % RING_COLORS.length];
                      return (
                        <TouchableOpacity
                          key={t.id}
                          style={[
                            styles.expandedTxRow,
                            i < expandedInRow.transactions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.cardBorder },
                          ]}
                          onPress={() => openEdit(t)}
                          activeOpacity={0.6}
                        >
                          <Text style={{ width: 54, fontSize: 13, color: txColor }}>
                            {new Date(t.date).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                          </Text>
                          <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: txColor }} numberOfLines={1}>
                            {t.description}
                          </Text>
                          <Text style={{ fontSize: 15, fontWeight: "600", color: txColor }}>
                            {formatCurrency(Math.abs(parseAmount(t.amount)))}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 32 },
  monthPickerContainer: { position: "relative", marginBottom: 4 },
  monthRow: { gap: 6, paddingBottom: 12, paddingHorizontal: 4 },
  fade: { position: "absolute", top: 0, bottom: 0, width: 32 },
  fadeLeft: { left: 0 },
  fadeRight: { right: 0 },
  scrollHint: { position: "absolute", right: 2, top: 0, bottom: 12, justifyContent: "center" },
  monthPill: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10 },
  monthPillText: { fontSize: 15, fontWeight: "500" },
  summaryFull: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  summaryHalf: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
  },
  emojiRow: { flexDirection: "row", marginBottom: 8 },
  emojiCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
  },
  expandedCard: {
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 8,
    overflow: "hidden",
  },
  expandedTxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
  },
});
