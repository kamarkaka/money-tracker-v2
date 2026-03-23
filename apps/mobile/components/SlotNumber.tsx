import { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, type TextStyle } from "react-native";

interface SlotNumberProps {
  value: string;
  style?: TextStyle;
  duration?: number;
}

function getCellHeight(fontSize: number): number {
  return Math.ceil(fontSize * 1.3);
}

function SlotDigit({ char, delay, duration, style, cellHeight }: {
  char: string;
  delay: number;
  duration: number;
  style?: TextStyle;
  cellHeight: number;
}) {
  const isDigit = /\d/.test(char);
  const anim = useRef(new Animated.Value(0)).current;
  const prevChar = useRef(char);

  useEffect(() => {
    if (!isDigit) return;
    anim.setValue(0);
    prevChar.current = char;
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
    return <Text style={[styles.char, style, { height: cellHeight, lineHeight: cellHeight }]}>{char}</Text>;
  }

  const digit = parseInt(char);
  const stripLength = 10 + digit + 1;
  const strip = Array.from({ length: stripLength }, (_, i) => i % 10);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(stripLength - 1) * cellHeight],
  });

  return (
    <View style={[styles.digitContainer, { height: cellHeight }]}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {strip.map((d, i) => (
          <Text key={i} style={[styles.digitCell, style, { height: cellHeight, lineHeight: cellHeight }]}>
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

export function SlotNumber({ value, style, duration = 800 }: SlotNumberProps) {
  const chars = value.split("");
  const fontSize = (style?.fontSize as number) || 20;
  const cellHeight = getCellHeight(fontSize);
  let digitIndex = 0;

  return (
    <View style={styles.container}>
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
            style={style}
            cellHeight={cellHeight}
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
  digitContainer: {
    overflow: "hidden",
  },
  char: {
    textAlign: "center",
  },
  digitCell: {
    textAlign: "center",
  },
});
