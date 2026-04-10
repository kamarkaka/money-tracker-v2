import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Tabs } from "expo-router";
import { View, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Transaction } from "@money-tracker/shared";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";
import { ModalContext } from "@/lib/addModal";
import { TransactionModal } from "@/components/TransactionModal";

const TAB_META: Record<string, { titleKey: string; icon: string; iconFocused: string; headerShown?: boolean }> = {
  overview:     { titleKey: "nav.overview",    icon: "pie-chart-outline",  iconFocused: "pie-chart",  headerShown: false },
  transactions: { titleKey: "nav.transaction", icon: "list-outline",       iconFocused: "list" },
  accounts:     { titleKey: "nav.account",     icon: "business-outline",   iconFocused: "business" },
  budgets:      { titleKey: "nav.budget",      icon: "wallet-outline",     iconFocused: "wallet" },
  categories:   { titleKey: "nav.category",    icon: "bookmark-outline",   iconFocused: "bookmark" },
  rules:        { titleKey: "nav.rule",        icon: "funnel-outline",     iconFocused: "funnel" },
  tags:         { titleKey: "nav.tag",         icon: "pricetag-outline",   iconFocused: "pricetag" },
};

const ALL_TAB_NAMES = ["overview", "transactions", "accounts", "budgets", "categories", "rules", "tags"];

export default function TabLayout() {
  const { theme, isPro, tabConfig } = useAppTheme();
  const { i18n } = useI18n();
  const insets = useSafeAreaInsets();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [dupTx, setDupTx] = useState<Transaction | null>(null);
  const [onComplete, setOnComplete] = useState<(() => void) | undefined>();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: modalOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [modalOpen]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "135deg"],
  });

  const openAdd = useCallback(() => { setEditTx(null); setDupTx(null); setModalOpen(true); }, []);
  const openEdit = useCallback((tx: Transaction) => { setEditTx(tx); setDupTx(null); setModalOpen(true); }, []);
  const openDuplicate = useCallback((tx: Transaction) => { setEditTx(null); setDupTx(tx); setModalOpen(true); }, []);
  const closeModal = useCallback(() => { setModalOpen(false); setEditTx(null); setDupTx(null); }, []);
  const toggle = useCallback(() => { if (modalOpen) closeModal(); else openAdd(); }, [modalOpen, closeModal, openAdd]);

  // Build ordered tab list: user's picks first, then hidden ones, then "add" and "more"
  const visibleTabs = isPro ? tabConfig : ["overview"];
  const hiddenTabs = ALL_TAB_NAMES.filter((t) => !visibleTabs.includes(t));
  const orderedTabs = [...visibleTabs, ...hiddenTabs];

  return (
    <ModalContext.Provider value={useMemo(() => ({
      isModalOpen: modalOpen, openAdd, openEdit, openDuplicate, closeModal, toggle,
      editTransaction: editTx, duplicateTransaction: dupTx, onComplete, setOnComplete,
    }), [modalOpen, openAdd, openEdit, openDuplicate, closeModal, toggle, editTx, dupTx, onComplete, setOnComplete])}>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: theme.brand,
            tabBarInactiveTintColor: theme.textSecondary,
            tabBarStyle: {
              backgroundColor: theme.card,
              borderTopColor: theme.cardBorder,
              height: 50 + insets.bottom,
              paddingBottom: insets.bottom,
              paddingTop: 8,
            },
            tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
            headerStyle: { backgroundColor: theme.card },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }}
        >
          {orderedTabs.map((name) => {
            const meta = TAB_META[name];
            const isVisible = visibleTabs.includes(name);
            return (
              <Tabs.Screen
                key={name}
                name={name}
                options={{
                  title: i18n(meta.titleKey),
                  headerShown: meta.headerShown ?? true,
                  href: isVisible ? undefined : null,
                  tabBarIcon: ({ color, focused }) => (
                    <Ionicons name={(focused ? meta.iconFocused : meta.icon) as any} size={26} color={color} />
                  ),
                }}
              />
            );
          })}
          <Tabs.Screen name="add" options={{ title: "", href: null }} />
          <Tabs.Screen name="more" options={{
            title: i18n("nav.more"),
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "menu" : "menu-outline"} size={26} color={color} />,
          }} />
        </Tabs>

        <TransactionModal open={modalOpen} onClose={closeModal} onComplete={onComplete} editTransaction={editTx} duplicateTransaction={dupTx} />

        <TouchableOpacity
          style={[styles.fab, isPro ? styles.fabRight : styles.fabCenter, { bottom: isPro ? insets.bottom + 56 : insets.bottom + 2, backgroundColor: theme.brand, shadowColor: theme.shadow }]}
          onPress={toggle}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="add" size={32} color={theme.brandText} />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </ModalContext.Provider>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 110,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  fabCenter: {
    alignSelf: "center",
  },
  fabRight: {
    right: 16,
  },
});
