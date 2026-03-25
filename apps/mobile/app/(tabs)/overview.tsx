import { useEffect, useState, useCallback, useRef, useMemo, memo } from "react";
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
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createTransactionApi, createCategoryApi, createBudgetApi } from "@money-tracker/api-client";
import { formatCurrency, parseAmount } from "@money-tracker/shared";
import type { Transaction, Category, BudgetBucket } from "@money-tracker/shared";
import { apiClient } from "@/lib/api";
import { useAppTheme } from "@/lib/themeContext";
import { FALLBACK_EMOJI, getEmojiIcon } from "@/lib/emoji";
import { useTransactionModal } from "@/lib/addModal";
import { SlotNumber } from "@/components/SlotNumber";
import { useI18n } from "@/lib/i18n";
import { RING_COLORS } from "@/lib/colors";

const txApi = createTransactionApi(apiClient);
const catApi = createCategoryApi(apiClient);
const budgetApi = createBudgetApi(apiClient);

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

const ProgressRing = memo(function ProgressRing({ size, strokeWidth, pct, ringColor, trackColor, children }: {
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
});

export default function OverviewScreen() {
  const { theme, isPro } = useAppTheme();
  const { i18n, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedEmoji, setExpandedEmoji] = useState<string | null>(null);
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<BudgetBucket[]>([]);
  const [showScrollBar, setShowScrollBar] = useState(true);
  const { openEdit, setOnComplete } = useTransactionModal();
  const [earliestDate, setEarliestDate] = useState<{ y: number; m: number } | null>(null);

  const nowRef = useRef(new Date());
  const now = nowRef.current;
  const [yearMonth, setYearMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const { year, month } = yearMonth;
  const monthScrollRef = useRef<ScrollView>(null);

  const screenWidth = Dimensions.get("window").width;

  const swipeRef = useRef({ setYearMonth, setExpandedEmoji, yearMonth });
  swipeRef.current = { setYearMonth, setExpandedEmoji, yearMonth };

  const goToPrevMonth = useCallback(() => {
    const { setYearMonth: setYM, setExpandedEmoji: setEE, yearMonth: ym } = swipeRef.current;
    const prev = addMonths(ym.year, ym.month, -1);
    setYM({ year: prev.y, month: prev.m });
    setEE(null);
  }, []);

  const goToNextMonth = useCallback(() => {
    const { setYearMonth: setYM, setExpandedEmoji: setEE, yearMonth: ym } = swipeRef.current;
    const n = new Date();
    if (ym.year === n.getFullYear() && ym.month === n.getMonth()) return;
    const next = addMonths(ym.year, ym.month, 1);
    setYM({ year: next.y, month: next.m });
    setEE(null);
  }, []);

  const edgeSwipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .runOnJS(true)
    .onEnd((e) => {
      const startX = e.absoluteX - e.translationX;
      const sw = screenWidth;
      if (startX >= sw - 50 && e.translationX < -40) {
        goToPrevMonth();
      } else if (startX <= 50 && e.translationX > 40) {
        goToNextMonth();
      }
    });

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

  const shortMonths = useMemo(() => getShortMonths(locale), [locale]);

  const fetchData = useCallback(async () => {
    const startDate = new Date(year, month, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

    const [txData, catData] = await Promise.all([
      txApi.list({ startDate, endDate, pageSize: 0 }),
      catApi.list(),
    ]);

    setTransactions(txData.transactions);
    setCategories(catData);

    if (isPro) {
      const b = await budgetApi.list();
      setBudgets(b);
    }
    refreshEarliestDate();
  }, [year, month, isPro, refreshEarliestDate]);

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

  // Parse amounts once
  const parsedAmounts = useMemo(
    () => new Map(transactions.map((t) => [t.id, parseAmount(t.amount)])),
    [transactions],
  );
  const getAmt = (t: Transaction) => parsedAmounts.get(t.id) ?? 0;

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
    g.total += getAmt(t);
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
  const totalIncome = nonTransfer.filter((t) => getAmt(t) > 0).reduce((s, t) => s + getAmt(t), 0);
  const totalExpenses = nonTransfer.filter((t) => getAmt(t) < 0).reduce((s, t) => s + getAmt(t), 0);
  const netSavings = totalIncome + totalExpenses;

  // Ring percentages use all transactions (including transfers), matching web app
  const allIncome = transactions.filter((t) => getAmt(t) > 0).reduce((s, t) => s + getAmt(t), 0);
  const allExpenses = transactions.filter((t) => getAmt(t) < 0).reduce((s, t) => s + getAmt(t), 0);

  const savingsColor = netSavings >= 0 ? theme.income : theme.expense;

  if (initialLoad) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const labeledYears = new Set<number>();

  return (
    <GestureDetector gesture={edgeSwipeGesture}>
    <View style={{ flex: 1, backgroundColor: theme.background }}>
    {/* #1 — Gradient header background */}
    <LinearGradient
      colors={[theme.gradientStart, theme.background]}
      style={styles.headerGradient}
      pointerEvents="none"
    />
    <ScrollView
      style={{ backgroundColor: "transparent" }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} progressViewOffset={insets.top} />}
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
                style={[styles.monthPill, isSelected && { backgroundColor: theme.brand }]}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.monthPillText,
                  { color: isSelected ? theme.brandText : theme.textSecondary },
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
          <View style={[styles.monthScrollBar, { backgroundColor: theme.scrollIndicator }]} pointerEvents="none" />
        )}
      </View>

      {/* Net Savings */}
      <LinearGradient
        colors={[netSavings >= 0 ? theme.incomeBg : theme.expenseBg, theme.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.savingsCard, { borderColor: theme.cardBorder, shadowColor: theme.shadow }]}
      >
        <Text style={[styles.savingsLabel, { color: theme.textSecondary }]}>
          {i18n("overview.netSavings")}
        </Text>
        <SlotNumber
          value={formatCurrency(netSavings, "USD", true)}
          style={{ ...styles.savingsAmount, color: savingsColor }}
        />
      </LinearGradient>

      {/* Income + Expenses */}
      <View style={styles.summaryRow}>
        <LinearGradient
          colors={[theme.incomeBg, theme.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.summaryCard, { borderColor: theme.cardBorder, shadowColor: theme.shadow }]}
        >
          <View style={[styles.summaryAccent, { backgroundColor: theme.income }]} />
          <View style={styles.summaryContent}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.textSecondary }}>{i18n("overview.totalIncome")}</Text>
            <SlotNumber
              value={formatCurrency(totalIncome, "USD", true)}
              style={{ fontSize: 20, fontWeight: "800", color: theme.income, marginTop: 2 }}
            />
          </View>
        </LinearGradient>
        <LinearGradient
          colors={[theme.expenseBg, theme.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.summaryCard, { borderColor: theme.cardBorder, shadowColor: theme.shadow }]}
        >
          <View style={[styles.summaryAccent, { backgroundColor: theme.expense }]} />
          <View style={styles.summaryContent}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.textSecondary }}>{i18n("overview.totalExpenses")}</Text>
            <SlotNumber
              value={formatCurrency(Math.abs(totalExpenses), "USD", true)}
              style={{ fontSize: 20, fontWeight: "800", color: theme.expense, marginTop: 2 }}
            />
          </View>
        </LinearGradient>
      </View>

      {/* Pro: Budget cards / Free: Category grid */}
      {transactions.length === 0 ? (
        <Text style={{ color: theme.textSecondary, textAlign: "center", marginTop: 40, fontSize: 14 }}>
          {i18n("overview.noTransactions")}
        </Text>
      ) : isPro ? (
        <View>
          {(() => {
            // Group transactions by budget bucket
            const catToBucket = new Map<string, string>();
            for (const b of budgets) {
              for (const bc of b.categories) {
                catToBucket.set(bc.category.id, b.id);
              }
            }

            const bucketTxMap = new Map<string, Transaction[]>();
            const uncategorized: Transaction[] = [];
            const otherTx: Transaction[] = [];

            for (const t of transactions) {
              if (!t.categoryId) {
                uncategorized.push(t);
              } else if (catToBucket.has(t.categoryId)) {
                const bId = catToBucket.get(t.categoryId)!;
                if (!bucketTxMap.has(bId)) bucketTxMap.set(bId, []);
                bucketTxMap.get(bId)!.push(t);
              } else {
                otherTx.push(t);
              }
            }

            const bucketCards = budgets.map((bucket, idx) => {
              const bTx = bucketTxMap.get(bucket.id) || [];
              const netTotal = bTx.reduce((s, t) => s + getAmt(t), 0);
              const expenses = bTx.reduce((s, t) => s + (getAmt(t) < 0 ? Math.abs(getAmt(t)) : 0), 0);
              const budgetAmt = typeof bucket.amount === "string" ? parseFloat(bucket.amount as string) : bucket.amount;
              const isNetIncome = netTotal > 0;
              // For expense buckets: track spending against budget
              // For income buckets: track earnings against budget
              const trackingAmount = isNetIncome ? netTotal : expenses;
              const pct = budgetAmt > 0 ? Math.min(trackingAmount / budgetAmt, 1) : 0;
              const remaining = budgetAmt - trackingAmount;
              const isExpanded = expandedBucket === bucket.id;
              const color = RING_COLORS[idx % RING_COLORS.length];
              const bucketIcon = bucket.icon ? getEmojiIcon(bucket.icon) : null;

              return (
                <View key={bucket.id} style={[styles.bucketCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <TouchableOpacity
                    style={styles.bucketHeader}
                    onPress={() => setExpandedBucket(isExpanded ? null : bucket.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.bucketIcon, { backgroundColor: color + "15" }]}>
                      {bucketIcon ? (
                        <Ionicons name={bucketIcon.icon} size={22} color={color} />
                      ) : (
                        <Ionicons name="wallet-outline" size={22} color={color} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={[styles.bucketName, { color: theme.text }]}>{bucket.name}</Text>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={{ fontSize: 15, fontWeight: "700", color: isNetIncome ? theme.income : theme.expense }}>
                            {formatCurrency(Math.abs(netTotal), "USD", true)}
                          </Text>
                          {budgetAmt > 0 && (
                            <Text style={{ fontSize: 12, color: remaining >= 0 ? theme.income : theme.expense, marginTop: 1 }}>
                              {formatCurrency(Math.abs(remaining), "USD", true)} {remaining >= 0 ? i18n("overview.left").replace("{amount}", "") : i18n("overview.over").replace("{amount}", "")}
                            </Text>
                          )}
                        </View>
                      </View>
                      {budgetAmt > 0 && (
                        <View style={{ marginTop: 6 }}>
                          <View style={[styles.progressTrack, { backgroundColor: color + "20" }]}>
                            <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
                          </View>
                        </View>
                      )}
                    </View>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={theme.textSecondary} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>

                  {isExpanded && bTx.length > 0 && (
                    <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.cardBorder }}>
                      {bTx.map((t, i) => {
                        const amt = getAmt(t);
                        return (
                          <TouchableOpacity
                            key={t.id}
                            style={[styles.expandedTxRow, i < bTx.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.cardBorder }]}
                            onPress={() => openEdit(t)}
                            activeOpacity={0.6}
                          >
                            <Text style={{ width: 54, fontSize: 13, color: theme.textSecondary }}>
                              {new Date(t.date).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                            </Text>
                            <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: theme.text }} numberOfLines={1}>
                              {t.description}
                            </Text>
                            <Text style={{ fontSize: 15, fontWeight: "600", color: amt < 0 ? theme.expense : theme.income }}>
                              {formatCurrency(Math.abs(amt))}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            });

            // "Others" bucket for categorized but non-budgeted
            const othersCard = otherTx.length > 0 ? (
              <View key="others" style={[styles.bucketCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <TouchableOpacity
                  style={styles.bucketHeader}
                  onPress={() => setExpandedBucket(expandedBucket === "others" ? null : "others")}
                  activeOpacity={0.7}
                >
                  <View style={[styles.bucketIcon, { backgroundColor: theme.textSecondary + "15" }]}>
                    <Ionicons name="cube-outline" size={22} color={theme.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={[styles.bucketName, { color: theme.text }]}>{i18n("overview.others")}</Text>
                      {(() => {
                        const net = otherTx.reduce((s, t) => s + getAmt(t), 0);
                        return (
                          <Text style={{ fontSize: 15, fontWeight: "700", color: net > 0 ? theme.income : theme.expense }}>
                            {net > 0 ? "+" : "-"}{formatCurrency(Math.abs(net), "USD", true)}
                          </Text>
                        );
                      })()}
                    </View>
                  </View>
                  <Ionicons name={expandedBucket === "others" ? "chevron-up" : "chevron-down"} size={18} color={theme.textSecondary} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
                {expandedBucket === "others" && (
                  <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.cardBorder }}>
                    {otherTx.map((t, i) => {
                      const amt = getAmt(t);
                      return (
                        <TouchableOpacity key={t.id} style={[styles.expandedTxRow, i < otherTx.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.cardBorder }]} onPress={() => openEdit(t)} activeOpacity={0.6}>
                          <Text style={{ width: 54, fontSize: 13, color: theme.textSecondary }}>{new Date(t.date).toLocaleDateString(locale, { month: "short", day: "numeric" })}</Text>
                          <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: theme.text }} numberOfLines={1}>{t.description}</Text>
                          <Text style={{ fontSize: 15, fontWeight: "600", color: amt < 0 ? theme.expense : theme.income }}>{formatCurrency(Math.abs(amt))}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null;

            // Uncategorized
            const uncatCard = uncategorized.length > 0 ? (
              <View key="uncat" style={[styles.bucketCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <TouchableOpacity
                  style={styles.bucketHeader}
                  onPress={() => setExpandedBucket(expandedBucket === "uncat" ? null : "uncat")}
                  activeOpacity={0.7}
                >
                  <View style={[styles.bucketIcon, { backgroundColor: theme.danger + "15" }]}>
                    <Ionicons name="help-outline" size={22} color={theme.danger} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={[styles.bucketName, { color: theme.text }]}>{i18n("overview.uncategorized")}</Text>
                      {(() => {
                        const net = uncategorized.reduce((s, t) => s + getAmt(t), 0);
                        return (
                          <Text style={{ fontSize: 15, fontWeight: "700", color: net > 0 ? theme.income : theme.expense }}>
                            {net > 0 ? "+" : "-"}{formatCurrency(Math.abs(net), "USD", true)}
                          </Text>
                        );
                      })()}
                    </View>
                  </View>
                  <Ionicons name={expandedBucket === "uncat" ? "chevron-up" : "chevron-down"} size={18} color={theme.textSecondary} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
                {expandedBucket === "uncat" && (
                  <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.cardBorder }}>
                    {uncategorized.map((t, i) => {
                      const amt = getAmt(t);
                      return (
                        <TouchableOpacity key={t.id} style={[styles.expandedTxRow, i < uncategorized.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.cardBorder }]} onPress={() => openEdit(t)} activeOpacity={0.6}>
                          <Text style={{ width: 54, fontSize: 13, color: theme.textSecondary }}>{new Date(t.date).toLocaleDateString(locale, { month: "short", day: "numeric" })}</Text>
                          <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: theme.text }} numberOfLines={1}>{t.description}</Text>
                          <Text style={{ fontSize: 15, fontWeight: "600", color: amt < 0 ? theme.expense : theme.income }}>{formatCurrency(Math.abs(amt))}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null;

            return <>{bucketCards}{othersCard}{uncatCard}</>;
          })()}
        </View>
      ) : (
        <View>
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

                {expandedInRow && (
                  <View style={[styles.expandedCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    {expandedInRow.transactions.map((t, i) => {
                      const dotColor = RING_COLORS[groups.indexOf(expandedInRow) % RING_COLORS.length];
                      const amt = getAmt(t);
                      return (
                        <TouchableOpacity
                          key={t.id}
                          style={[styles.expandedTxRow, i < expandedInRow.transactions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.cardBorder }]}
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
                          <Text style={{ fontSize: 15, fontWeight: "600", color: amt < 0 ? theme.expense : theme.income }}>
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
    </GestureDetector>
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
  },
  monthPill: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10 },
  monthPillText: { fontSize: 15, fontWeight: "500" },
  // #7
  savingsCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  savingsLabel: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  savingsAmount: { fontSize: 24, fontWeight: "800" },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryAccent: { width: 4 },
  summaryContent: { flex: 1, padding: 14 },
  // Pro budget cards
  bucketCard: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
  },
  bucketHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  bucketIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  bucketName: { fontSize: 16, fontWeight: "700" },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  // Free emoji grid
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
