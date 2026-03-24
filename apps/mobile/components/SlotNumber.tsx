import { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, type TextStyle } from "react-native";

interface SlotNumberProps {
  value: string;
  style?: TextStyle;
  duration?: number;
}

const CELL_HEIGHT = 28;

function SlotDigit({ char, delay, duration, color }: {
  char: string;
  delay: number;
  duration: number;
  color?: string;
}) {
  const isDigit = /\d/.test(char);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isDigit) return;
    anim.setValue(0);
    const timer = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [char, delay, duration, isDigit]);

  if (!isDigit) {
    return <Text style={[styles.cell, { height: CELL_HEIGHT, lineHeight: CELL_HEIGHT, color }]}>{char}</Text>;
  }

  const digit = parseInt(char);
  const stripLength = 10 + digit + 1;
  const strip = Array.from({ length: stripLength }, (_, i) => i % 10);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(stripLength - 1) * CELL_HEIGHT],
  });

  return (
    <View style={{ height: CELL_HEIGHT, overflow: "hidden" }}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {strip.map((d, i) => (
          <Text key={i} style={[styles.cell, { height: CELL_HEIGHT, lineHeight: CELL_HEIGHT, color }]}>{d}</Text>
        ))}
      </Animated.View>
    </View>
  );
}

export function SlotNumber({ value, style, duration = 800 }: SlotNumberProps) {
  const fontSize = (style?.fontSize as number) || 20;

  // For very small font sizes, skip the slot animation — just render plain text
  if (fontSize < 16) {
    return <Text style={style}>{value}</Text>;
  }

  const chars = value.split("");
  const scale = fontSize / 20;
  let digitIndex = 0;

  return (
    <View style={[styles.container, { transform: [{ scale }], transformOrigin: "center center" }]}>
      {chars.map((char, i) => {
        const isDigit = /\d/.test(char);
        const delay = isDigit ? digitIndex * 50 : 0;
        if (isDigit) digitIndex++;
        return (
          <SlotDigit
            key={`${i}-${char}`}
            char={char}
            delay={delay}
            duration={duration}
            color={style?.color as string}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  cell: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
});
