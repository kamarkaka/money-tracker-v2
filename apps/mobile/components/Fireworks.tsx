import { useEffect, useRef, useState } from "react";
import { View, Animated, Dimensions, StyleSheet } from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");

const COLORS = [
  "#ff4757", "#ff6b81", "#ffa502", "#ffda79",
  "#2ed573", "#7bed9f", "#1e90ff", "#70a1ff",
  "#a855f7", "#c084fc", "#ff6348", "#eccc68",
];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

interface ExplosionParticle {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
}

interface RocketBurst {
  particles: ExplosionParticle[];
  originX: number;
  originY: number;
}

function createBurst(originX: number, originY: number): RocketBurst {
  const color = randomColor();
  const count = 25 + Math.floor(Math.random() * 15);
  const particles: ExplosionParticle[] = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      x: new Animated.Value(originX),
      y: new Animated.Value(originY),
      opacity: new Animated.Value(1),
      color: Math.random() > 0.3 ? color : randomColor(),
      size: 3 + Math.random() * 4,
    });
  }

  return { particles, originX, originY };
}

function animateBurst(burst: RocketBurst): Animated.CompositeAnimation {
  const animations = burst.particles.map((p) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 160;
    const targetX = burst.originX + Math.cos(angle) * speed;
    const targetY = burst.originY + Math.sin(angle) * speed + 40; // gravity pull down

    const dur = 600 + Math.random() * 400;

    return Animated.parallel([
      Animated.timing(p.x, { toValue: targetX, duration: dur, useNativeDriver: true }),
      Animated.timing(p.y, { toValue: targetY, duration: dur, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(dur * 0.4),
        Animated.timing(p.opacity, { toValue: 0, duration: dur * 0.6, useNativeDriver: true }),
      ]),
    ]);
  });

  return Animated.parallel(animations);
}

export function Fireworks({ duration = 3000, onDone }: { duration?: number; onDone?: () => void }) {
  const [bursts, setBursts] = useState<RocketBurst[]>([]);
  const burstCount = useRef(0);

  useEffect(() => {
    const totalBursts = 6 + Math.floor(Math.random() * 4);
    const interval = (duration * 0.7) / totalBursts;
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < totalBursts; i++) {
      const timer = setTimeout(() => {
        const x = SW * 0.15 + Math.random() * SW * 0.7;
        const y = SH * 0.1 + Math.random() * SH * 0.35;
        const burst = createBurst(x, y);

        setBursts((prev) => [...prev, burst]);
        animateBurst(burst).start(() => {
          burstCount.current++;
          if (burstCount.current >= totalBursts) {
            setTimeout(() => onDone?.(), 500);
          }
        });
      }, i * interval + Math.random() * 150);

      timers.push(timer);
    }

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {bursts.map((burst, bi) =>
        burst.particles.map((p, pi) => (
          <Animated.View
            key={`${bi}-${pi}`}
            style={{
              position: "absolute",
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
              opacity: p.opacity,
              transform: [{ translateX: p.x }, { translateY: p.y }],
            }}
          />
        )),
      )}
    </View>
  );
}
