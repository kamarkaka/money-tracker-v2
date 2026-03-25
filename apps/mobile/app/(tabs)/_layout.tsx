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

export default function TabLayout() {
  const { theme, isPro } = useAppTheme();
  const { i18n } = useI18n();
  const insets = useSafeAreaInsets();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
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

  const openAdd = useCallback(() => {
    setEditTx(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((tx: Transaction) => {
    setEditTx(tx);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditTx(null);
  }, []);

  const toggle = useCallback(() => {
    if (modalOpen) closeModal();
    else openAdd();
  }, [modalOpen, closeModal, openAdd]);

  return (
    <ModalContext.Provider value={useMemo(() => ({
      isModalOpen: modalOpen,
      openAdd,
      openEdit,
      closeModal,
      toggle,
      editTransaction: editTx,
      onComplete,
      setOnComplete,
    }), [modalOpen, openAdd, openEdit, closeModal, toggle, editTx, onComplete, setOnComplete])}>
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
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: "600",
            },
            headerStyle: { backgroundColor: theme.card },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }}
        >
          <Tabs.Screen
            name="overview"
            options={{
              title: i18n("nav.overview"),
              headerShown: false,
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "pie-chart" : "pie-chart-outline"} size={26} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="accounts"
            options={{
              title: i18n("nav.account"),
              href: isPro ? undefined : null,
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "business" : "business-outline"} size={26} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="add"
            options={{
              title: "",
              tabBarButton: () => <View style={styles.addSpacer} />,
            }}
          />
          <Tabs.Screen
            name="transactions"
            options={{
              title: i18n("nav.transaction"),
              href: isPro ? undefined : null,
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "list" : "list-outline"} size={26} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="more"
            options={{
              title: i18n("nav.more"),
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "menu" : "menu-outline"} size={26} color={color} />
              ),
            }}
          />
        </Tabs>

        <TransactionModal
          open={modalOpen}
          onClose={closeModal}
          onComplete={onComplete}
          editTransaction={editTx}
        />

        {/* Floating + / x button */}
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 2, backgroundColor: theme.brand, shadowColor: theme.shadow }]}
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
  addSpacer: {
    flex: 1,
  },
  fab: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
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
});
