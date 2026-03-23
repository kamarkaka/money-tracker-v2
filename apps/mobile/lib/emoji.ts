// Map emoji strings (from API) to Ionicons names for reliable native rendering.
// Expo Go / Hermes cannot render color emoji characters, so we use vector icons instead.

import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface EmojiIcon {
  icon: IconName;
  color: string;
  label: string;
}

// Map from emoji character → icon definition
// Covers all emojis used in the web app's casual mode
const EMOJI_ICON_MAP: Record<string, EmojiIcon> = {};

function register(emoji: string, icon: IconName, color: string, label: string) {
  EMOJI_ICON_MAP[emoji] = { icon, color, label };
}

// Use String.fromCodePoint so the keys match what the API returns
function e(cp: number) { return String.fromCodePoint(cp); }
function e2(cp1: number, cp2: number) { return String.fromCodePoint(cp1, cp2); }

register(e(0x1F354),        "restaurant-outline", "#ef4444", "Food & Dining");  // 🍔
register(e(0x1F6D2),        "cart-outline",       "#f59e0b", "Groceries");      // 🛒
register(e(0x2615),         "cafe-outline",       "#92400e", "Coffee");         // ☕
register(e(0x1F697),        "car-outline",        "#3b82f6", "Transportation"); // 🚗
register(e(0x26FD),         "flame-outline",      "#f97316", "Gas");            // ⛽
register(e(0x1F3E0),        "home-outline",       "#8b5cf6", "Housing");        // 🏠
register(e(0x1F48A),        "medkit-outline",     "#ec4899", "Health");         // 💊
register(e(0x1F3AE),        "game-controller-outline", "#6366f1", "Entertainment"); // 🎮
register(e(0x1F455),        "shirt-outline",      "#14b8a6", "Shopping");       // 👕
register(e(0x1F4F1),        "phone-portrait-outline", "#0ea5e9", "Subscriptions"); // 📱
register(e2(0x2708, 0xFE0F),"airplane-outline",   "#0284c7", "Travel");        // ✈️
register(e(0x2708),         "airplane-outline",   "#0284c7", "Travel");         // ✈ (without FE0F)
register(e(0x1F393),        "school-outline",     "#7c3aed", "Education");      // 🎓
register(e(0x1F4B0),        "cash-outline",       "#16a34a", "Income");         // 💰
register(e(0x1F4B3),        "card-outline",       "#dc2626", "Bills");          // 💳
register(e(0x1F43E),        "paw-outline",        "#a16207", "Pets");           // 🐾
register(e(0x1F476),        "happy-outline",      "#e879f9", "Kids");           // 👶
register(e(0x1F487),        "cut-outline",        "#d946ef", "Personal Care");  // 💇
register(e(0x1F381),        "gift-outline",       "#e11d48", "Gifts");          // 🎁
register(e2(0x1F3CB, 0xFE0F),"barbell-outline",   "#059669", "Fitness");       // 🏋️
register(e(0x1F3CB),        "barbell-outline",    "#059669", "Fitness");        // 🏋 (without FE0F)
register(e(0x1F4E6),        "cube-outline",       "#71717a", "Others");         // 📦

const FALLBACK_ICON: EmojiIcon = { icon: "cube-outline", color: "#71717a", label: "Others" };

export function getEmojiIcon(emoji: string | null | undefined): EmojiIcon {
  if (!emoji) return FALLBACK_ICON;
  return EMOJI_ICON_MAP[emoji] || FALLBACK_ICON;
}

export const FALLBACK_EMOJI = e(0x1F4E6);

// Ordered list of default category icons (for the add-transaction picker)
export const DEFAULT_CATEGORY_ICONS: { emoji: string; icon: EmojiIcon }[] = [
  e(0x1F354), e(0x1F6D2), e(0x2615), e(0x1F697), e(0x26FD), e(0x1F3E0),
  e(0x1F48A), e(0x1F3AE), e(0x1F455), e(0x1F4F1), e2(0x2708, 0xFE0F), e(0x1F393),
  e(0x1F4B0), e(0x1F4B3), e(0x1F43E), e(0x1F476), e(0x1F487), e(0x1F381),
  e2(0x1F3CB, 0xFE0F), e(0x1F4E6),
].map((emoji) => ({ emoji, icon: getEmojiIcon(emoji) }));
