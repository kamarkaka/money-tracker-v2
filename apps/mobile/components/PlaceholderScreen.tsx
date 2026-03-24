import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
}

export function PlaceholderScreen({ icon, iconColor, title }: Props) {
  const { theme } = useAppTheme();
  const { i18n } = useI18n();

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background, gap: 12 }}>
      <Ionicons name={icon} size={48} color={iconColor} />
      <Text style={{ color: theme.text, fontSize: 20, fontWeight: "700" }}>{title}</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{i18n("more.comingSoon")}</Text>
    </View>
  );
}
