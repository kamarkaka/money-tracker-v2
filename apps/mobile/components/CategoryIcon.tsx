import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getEmojiIcon } from "@/lib/emoji";

interface Props {
  emoji: string | null | undefined;
  size?: number;
}

export function CategoryIcon({ emoji, size = 28 }: Props) {
  const { icon, color } = getEmojiIcon(emoji);
  return (
    <View style={{ justifyContent: "center", alignItems: "center" }}>
      <Ionicons name={icon} size={size} color={color} />
    </View>
  );
}
