import { useState, useRef, useEffect, useCallback } from "react";
import { Tabs } from "expo-router";
import { View, TouchableOpacity, StyleSheet, useColorScheme, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Transaction } from "@money-tracker/shared";
import { colors } from "@/lib/theme";
import { ModalContext } from "@/lib/addModal";
import { TransactionModal } from "@/components/TransactionModal";

export default function TabLayout() {
  const scheme = useColorScheme();
  const theme = colors[scheme === "dark" ? "dark" : "light"];

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
    <ModalContext.Provider value={{
      isModalOpen: modalOpen,
      openAdd,
      openEdit,
      closeModal,
      toggle,
      editTransaction: editTx,
      onComplete,
      setOnComplete,
    }}>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: theme.accent,
            tabBarInactiveTintColor: theme.textSecondary,
            tabBarStyle: {
              backgroundColor: theme.card,
              borderTopColor: theme.cardBorder,
              height: 88,
              paddingBottom: 28,
              paddingTop: 8,
            },
            headerStyle: { backgroundColor: theme.card },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }}
        >
          <Tabs.Screen
            name="overview"
            options={{
              title: "Overview",
              headerShown: false,
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "pie-chart" : "pie-chart-outline"} size={24} color={color} />
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
            name="more"
            options={{
              title: "More",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "menu" : "menu-outline"} size={24} color={color} />
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
          style={styles.fab}
          onPress={toggle}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="add" size={32} color="#ffffff" />
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
    bottom: 44,
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 110,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
});
