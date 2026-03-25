import { useRef, useEffect, useCallback } from "react";
import { View, TouchableOpacity, Animated, PanResponder, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";

const DELETE_WIDTH = 80;

// Context to coordinate swipeable rows — only one open at a time
const SwipeableContext = React.createContext<{
  openId: string | null;
  setOpenId: (id: string | null) => void;
}>({ openId: null, setOpenId: () => {} });

export function SwipeableProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const value = React.useMemo(() => ({ openId, setOpenId }), [openId]);
  return (
    <SwipeableContext.Provider value={value}>
      {children}
    </SwipeableContext.Provider>
  );
}

export function useCloseSwipeable() {
  const { setOpenId } = React.useContext(SwipeableContext);
  return () => setOpenId(null);
}

interface Props {
  children: React.ReactNode;
  onDelete: () => void;
  dangerColor?: string;
  id?: string;
}

export function SwipeableRow({ children, onDelete, dangerColor = "#ef4444", id }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const rowId = useRef(id || Math.random().toString(36)).current;
  const { openId, setOpenId } = React.useContext(SwipeableContext);
  const isOpen = openId === rowId;

  // Close this row when another row opens
  useEffect(() => {
    if (!isOpen) {
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    }
  }, [isOpen]);

  const open = useCallback(() => {
    setOpenId(rowId);
    Animated.spring(translateX, { toValue: -DELETE_WIDTH, useNativeDriver: true }).start();
  }, [rowId, setOpenId]);

  const close = useCallback(() => {
    setOpenId(null);
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
  }, [setOpenId]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) translateX.setValue(Math.max(gs.dx, -DELETE_WIDTH));
        else if (gs.dx > 0) translateX.setValue(Math.min(gs.dx, 0));
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -DELETE_WIDTH / 2) {
          open();
        } else {
          close();
        }
      },
    }),
  ).current;

  // If another row is open and user taps this row's content, close the open one
  const handlePress = useCallback(() => {
    if (openId && openId !== rowId) {
      setOpenId(null);
    }
  }, [openId, rowId, setOpenId]);

  return (
    <View style={styles.container} onTouchStart={handlePress}>
      <View style={[styles.deleteAction, { backgroundColor: dangerColor }]}>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => { close(); onDelete(); }}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: "hidden" },
  deleteAction: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_WIDTH,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: DELETE_WIDTH,
  },
});
