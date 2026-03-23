import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";
import { colors } from "@/lib/theme";

export default function TabLayout() {
  const scheme = useColorScheme();
  const theme = colors[scheme === "dark" ? "dark" : "light"];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.cardBorder,
        },
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.text,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="overview"
        options={{
          title: "Overview",
          tabBarIcon: ({ color, size }) => <TabIcon name="chart" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ color, size }) => <TabIcon name="list" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => <TabIcon name="more" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

// Simple text-based icons (replace with @expo/vector-icons if desired)
function TabIcon({ name, color, size }: { name: string; color: string; size: number }) {
  const { Text } = require("react-native");
  const icons: Record<string, string> = {
    chart: "\u{1F4CA}",
    list: "\u{1F4CB}",
    more: "\u{2699}\u{FE0F}",
  };
  return <Text style={{ fontSize: size * 0.8, color }}>{icons[name] || "?"}</Text>;
}
