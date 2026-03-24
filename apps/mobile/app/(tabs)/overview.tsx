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
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
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

// #3 — Harmonized teal/cyan/blue palette (avoids #10b981 green button)
const RING_COLORS = [
  "#0ea5e9", "#8b5cf6", "#06b6d4", "#f59e0b",
  "#0891b2", "#6366f1", "#0d9488", "#ec4899",
  "#0284c7", "#0e7490",
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

function ProgressRing({ size, strokeWidth, pct, ringColor, trackColor, children }: {
  size: number;
  strokeWidth: number;
  pct: number;
  ringColor: string;
  trackColor: string;
  children: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(Math.max(pct, 0), 1);
  const offset = circumference - clampedPct * circumference;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle
          cx={center} cy={center} r={radius}
          fill="none" stroke={trackColor} strokeWidth={strokeWidth}
        />
        <Circle
          cx={center} cy={center} r={radius}
          fill="none" stroke={ringColor} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </Svg>
      <View style={{ position: "absolute", width: size, height: size, justifyContent: "center", alignItems: "center" }}>
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
  const [showScrollBar, setShowScrollBar] = useState(true);
  const { openEdit, setOnComplete } = useTransactionModal();
  const [earliestDate, setEarliestDate] = useState<{ y: number; m: number } | null>(null);

  const now = new Date();
  const [yearMonth, setYearMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const { year, month } = yearMonth;
  const monthScrollRef = useRef<ScrollView>(null);

  const screenWidth = Dimensions.get("window").width;
  const EDGE_ZONE = 50;
  const SWIPE_THRESHOLD = 40;

  const swipeRef = useRef({ setYearMonth, setExpandedEmoji, yearMonth });
  swipeRef.current = { setYearMonth, setExpandedEmoji, yearMonth };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e: GestureResponderEvent, gs: PanResponderGestureState) => {
        const startX = (gs as any).x0 ?? 0;
        const sw = Dimensions.get("window").width;
        const isEdge = startX <= 50 || startX >= sw - 50;
        return isEdge && Math.abs(gs.dx) > 15 && Math.abs(gs.dx) > Math.abs(gs.dy) * 2;
      },
      onPanResponderRelease: (_e: GestureResponderEvent, gs: PanResponderGestureState) => {
        const startX = (gs as any).x0 ?? 0;
        const sw = Dimensions.get("window").width;
        const { setYearMonth: setYM, setExpandedEmoji: setEE, yearMonth: ym } = swipeRef.current;
        if (startX >= sw - 50 && gs.dx < -40) {
          const prev = addMonths(ym.year, ym.month, -1);
          setYM({ year: prev.y, month: prev.m });
          setEE(null);
        } else if (startX <= 50 && gs.dx > 40) {
          const n = new Date();
          if (ym.year === n.getFullYear() && ym.month === n.getMonth()) return;
          const next = addMonths(ym.year, ym.month, 1);
          setYM({ year: next.y, month: next.m });
          setEE(null);
        }
      },
    }),
  ).current;

  const handleMonthScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setShowScrollBar(contentOffset.x < contentSize.width - layoutMeasurement.width - 10);
  };

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

  // Scroll month picker to reveal selected month
  useEffect(() => {
    const nowY = now.getFullYear();
    const nowM = now.getMonth();
    // Index in monthPills (0 = current month, increasing = older)
    const idx = (nowY - year) * 12 + (nowM - month);
    if (idx >= 0 && monthScrollRef.current) {
      const PILL_WIDTH = 82; // approximate pill width + gap
      setTimeout(() => {
        monthScrollRef.current?.scrollTo({ x: Math.max(0, idx * PILL_WIDTH - 40), animated: true });
      }, 50);
    }
  }, [year, month]);

  // Register fetchData so the transaction modal refreshes data after save/delete
  useEffect(() => {
    setOnComplete(() => fetchData);
  }, [fetchData, setOnComplete]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchData(),
      new Promise((r) => setTimeout(r, 1000)),
    ]);
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

  // Ring percentages use all transactions (including transfers), matching web app
  const allIncome = transactions.filter((t) => parseAmount(t.amount) > 0).reduce((s, t) => s + parseAmount(t.amount), 0);
  const allExpenses = transactions.filter((t) => parseAmount(t.amount) < 0).reduce((s, t) => s + parseAmount(t.amount), 0);

  // #7 — Net savings color
  const savingsColor = netSavings >= 0
    ? (isDark ? "#34d399" : "#059669")
    : (isDark ? "#f87171" : "#dc2626");

  if (initialLoad) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const labeledYears = new Set<number>();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }} {...panResponder.panHandlers}>
    {/* #1 — Gradient header background */}
    <LinearGradient
      colors={isDark ? ["#064e3b", theme.background] : ["#ecfdf5", theme.background]}
      style={styles.headerGradient}
      pointerEvents="none"
    />
    <ScrollView
      style={{ backgroundColor: "transparent" }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" progressViewOffset={insets.top} />}
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
                onPress={() => { setYearMonth({ year: y, month: m }); setExpandedEmoji(null); }}
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
        {showScrollBar && (
          <View style={styles.monthScrollBar} pointerEvents="none" />
        )}
      </View>

      {/* #7 — Net Savings hero card */}
      <View style={[styles.savingsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.savingsLabel, { color: theme.textSecondary }]}>
          {i18n("overview.netSavings")}
        </Text>
        <View style={{ marginTop: 4 }}>
          <SlotNumber
            value={formatCurrency(netSavings, "USD", true)}
            style={{ ...styles.savingsAmount, color: savingsColor, textShadowColor: savingsColor + "40", textShadowRadius: 12 }}
          />
        </View>
      </View>

      {/* #2 — Summary cards with left accent border */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.summaryAccent, { backgroundColor: isDark ? "#34d399" : "#059669" }]} />
          <View style={styles.summaryContent}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.textSecondary }}>{i18n("overview.totalIncome")}</Text>
            <View style={{ marginTop: 2 }}>
              <SlotNumber
                value={formatCurrency(totalIncome, "USD", true)}
                style={{ fontSize: 20, fontWeight: "800", color: isDark ? "#34d399" : "#059669" }}
              />
            </View>
          </View>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.summaryAccent, { backgroundColor: isDark ? "#f87171" : "#dc2626" }]} />
          <View style={styles.summaryContent}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.textSecondary }}>{i18n("overview.totalExpenses")}</Text>
            <View style={{ marginTop: 2 }}>
              <SlotNumber
                value={formatCurrency(Math.abs(totalExpenses), "USD", true)}
                style={{ fontSize: 20, fontWeight: "800", color: isDark ? "#f87171" : "#dc2626" }}
              />
            </View>
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
                    const base = isIncome ? allIncome : Math.abs(allExpenses);
                    const pct = base > 0 ? Math.min(absTotal / base, 1) : 0;
                    const ringColor = RING_COLORS[index % RING_COLORS.length];
                    const isExpanded = expandedEmoji === group.emoji;
                    const iconInfo = getEmojiIcon(group.emoji);

                    return (
                      // #4 — Category chip cards with tinted background
                      <TouchableOpacity
                        key={group.emoji}
                        style={[
                          styles.emojiCell,
                          isExpanded && { backgroundColor: ringColor + "20" },
                          isExpanded && { borderColor: ringColor + "40", borderWidth: 1 },
                        ]}
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

                {/* #8 — Expanded transaction list with color dots */}
                {expandedInRow && (
                  <View style={[styles.expandedCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    {expandedInRow.transactions.map((t, i) => {
                      const dotColor = RING_COLORS[groups.indexOf(expandedInRow) % RING_COLORS.length];
                      const amt = parseAmount(t.amount);
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
                          <View style={[styles.txDot, { backgroundColor: dotColor }]} />
                          <Text style={{ width: 54, fontSize: 13, color: theme.textSecondary }}>
                            {new Date(t.date).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                          </Text>
                          <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: theme.text }} numberOfLines={1}>
                            {t.description}
                          </Text>
                          <Text style={{ fontSize: 15, fontWeight: "600", color: amt < 0 ? (isDark ? "#f87171" : "#dc2626") : (isDark ? "#34d399" : "#059669") }}>
                            {formatCurrency(Math.abs(amt))}
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
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 32 },
  // #1
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: -1,
  },
  monthPickerContainer: { position: "relative", marginBottom: 4, marginTop: 8 },
  monthRow: { gap: 6, paddingBottom: 12, paddingHorizontal: 4 },
  monthScrollBar: {
    position: "absolute",
    right: 0,
    top: 6,
    bottom: 18,
    width: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  monthPill: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10 },
  monthPillText: { fontSize: 15, fontWeight: "500" },
  // #7
  savingsCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 10,
  },
  savingsLabel: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  savingsAmount: { fontSize: 24, fontWeight: "800" },
  // #2
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    overflow: "hidden",
  },
  summaryAccent: {
    width: 4,
  },
  summaryContent: {
    flex: 1,
    padding: 14,
  },
  // #4
  emojiRow: { flexDirection: "row", marginBottom: 8 },
  emojiCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
  },
  // #8
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
  txDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
