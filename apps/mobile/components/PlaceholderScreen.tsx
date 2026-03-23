import { View, Text, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
}

export function PlaceholderScreen({ icon, iconColor, title }: Props) {
  const scheme = useColorScheme();
  const theme = colors[scheme === "dark" ? "dark" : "light"];

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background, gap: 12 }}>
      <Ionicons name={icon} size={48} color={iconColor} />
      <Text style={{ color: theme.text, fontSize: 20, fontWeight: "700" }}>{title}</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 14 }}>Coming soon</Text>
    </View>
  );
}
