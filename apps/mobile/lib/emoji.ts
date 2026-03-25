// Map emoji strings (from API) to Ionicons names for reliable native rendering.
// Expo Go / Hermes cannot render color emoji characters, so we use vector icons instead.

import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

type IconName = ComponentProps<typeof Ionicons>["name"];

export interface EmojiIcon {
  icon: IconName;
  color: string;
  label: string;
  i18nKey: string;
}

// Map from emoji character → icon definition
const EMOJI_ICON_MAP: Record<string, EmojiIcon> = {};

function register(emoji: string, icon: IconName, color: string, label: string, i18nKey: string) {
  EMOJI_ICON_MAP[emoji] = { icon, color, label, i18nKey };
}

// Use String.fromCodePoint so the keys match what the API returns
function e(cp: number) { return String.fromCodePoint(cp); }
function e2(cp1: number, cp2: number) { return String.fromCodePoint(cp1, cp2); }

register(e(0x1F354),        "restaurant-outline", "#ef4444", "Food & Dining",  "categoryName.foodDining");
register(e(0x1F6D2),        "cart-outline",       "#f59e0b", "Groceries",      "categoryName.groceries");
register(e(0x2615),         "cafe-outline",       "#92400e", "Coffee",         "categoryName.coffee");
register(e(0x1F697),        "car-outline",        "#3b82f6", "Transportation", "categoryName.transportation");
register(e(0x26FD),         "flame-outline",      "#f97316", "Gas",            "categoryName.gas");
register(e(0x1F3E0),        "home-outline",       "#8b5cf6", "Housing",        "categoryName.housing");
register(e(0x1F48A),        "medkit-outline",     "#ec4899", "Health",         "categoryName.health");
register(e(0x1F3AE),        "game-controller-outline", "#6366f1", "Entertainment", "categoryName.entertainment");
register(e(0x1F455),        "shirt-outline",      "#14b8a6", "Shopping",       "categoryName.shopping");
register(e(0x1F4F1),        "phone-portrait-outline", "#0ea5e9", "Subscriptions", "categoryName.subscriptions");
register(e2(0x2708, 0xFE0F),"airplane-outline",   "#0284c7", "Travel",        "categoryName.travel");
register(e(0x2708),         "airplane-outline",   "#0284c7", "Travel",         "categoryName.travel");
register(e(0x1F393),        "school-outline",     "#7c3aed", "Education",      "categoryName.education");
register(e(0x1F4B0),        "cash-outline",       "#16a34a", "Income",         "categoryName.income");
register(e(0x1F4B3),        "card-outline",       "#dc2626", "Bills",          "categoryName.bills");
register(e(0x1F43E),        "paw-outline",        "#a16207", "Pets",           "categoryName.pets");
register(e(0x1F476),        "happy-outline",      "#e879f9", "Kids",           "categoryName.kids");
register(e(0x1F487),        "cut-outline",        "#d946ef", "Personal Care",  "categoryName.personalCare");
register(e(0x1F381),        "gift-outline",       "#e11d48", "Gifts",          "categoryName.gifts");
register(e2(0x1F3CB, 0xFE0F),"barbell-outline",   "#059669", "Fitness",       "categoryName.fitness");
register(e(0x1F3CB),        "barbell-outline",    "#059669", "Fitness",        "categoryName.fitness");
register(e(0x1F4E6),        "cube-outline",       "#71717a", "Others",         "categoryName.others");

// Extended icons for category picker
register(e(0x1F3B5),        "musical-notes-outline", "#7c3aed", "Music",       "categoryName.music");
register(e(0x1F4DA),        "book-outline",       "#0891b2", "Books",          "categoryName.books");
register(e(0x1F4BB),        "laptop-outline",     "#6366f1", "Tech",           "categoryName.tech");
register(e(0x1F3E2),        "business-outline",   "#64748b", "Office",         "categoryName.office");
register(e(0x1F37D),        "wine-outline",       "#be185d", "Dining Out",     "categoryName.diningOut");
register(e(0x1F6BF),        "water-outline",      "#0ea5e9", "Utilities",      "categoryName.utilities");
register(e(0x1F4F0),        "newspaper-outline",  "#78716c", "News",           "categoryName.news");
register(e(0x1F3A8),        "color-palette-outline", "#f472b6", "Art",         "categoryName.art");
register(e(0x1F4B8),        "trending-down-outline", "#dc2626", "Debt",        "categoryName.debt");
register(e(0x1F4C8),        "trending-up-outline", "#16a34a", "Investments",    "categoryName.investments");
register(e(0x1F3D5),        "leaf-outline",       "#22c55e", "Nature",         "categoryName.nature");
register(e(0x1F6E0),        "construct-outline",  "#a16207", "Repairs",        "categoryName.repairs");
register(e(0x1F4F7),        "camera-outline",     "#8b5cf6", "Photography",    "categoryName.photography");
register(e(0x1F3AC),        "film-outline",       "#f59e0b", "Movies",         "categoryName.movies");
register(e(0x26BD),         "football-outline",   "#059669", "Sports",         "categoryName.sports");
register(e(0x1F4E7),        "mail-outline",       "#0284c7", "Mail",           "categoryName.mail");
register(e(0x1F48E),        "diamond-outline",    "#06b6d4", "Luxury",         "categoryName.luxury");
register(e(0x1F6E1),        "shield-outline",     "#64748b", "Insurance",      "categoryName.insurance");
register(e(0x2764),         "heart-outline",      "#ef4444", "Charity",        "categoryName.charity");
register(e(0x1F3C6),        "trophy-outline",     "#f59e0b", "Rewards",        "categoryName.rewards");

// More extended icons
register(e(0x1F3E5),        "fitness-outline",    "#ef4444", "Hospital",       "categoryName.hospital");
register(e(0x1F4D6),        "reader-outline",     "#0891b2", "Reading",        "categoryName.reading");
register(e(0x1F3B2),        "dice-outline",       "#8b5cf6", "Games",          "categoryName.games");
register(e(0x1F527),        "settings-outline",   "#71717a", "Maintenance",    "categoryName.maintenance");
register(e(0x1F3E8),        "bed-outline",        "#6366f1", "Hotel",          "categoryName.hotel");
register(e(0x1F37A),        "beer-outline",       "#f59e0b", "Drinks",         "categoryName.drinks");
register(e(0x1F4E2),        "megaphone-outline",  "#ec4899", "Marketing",      "categoryName.marketing");
register(e(0x1F4BC),        "briefcase-outline",  "#64748b", "Business",       "categoryName.business");
register(e(0x1F392),        "school-outline",     "#14b8a6", "School Supplies", "categoryName.schoolSupplies");
register(e(0x1F4DD),        "document-text-outline", "#78716c", "Documents",   "categoryName.documents");
register(e(0x1F512),        "lock-closed-outline", "#a16207", "Security",      "categoryName.security");
register(e(0x1F4A1),        "bulb-outline",       "#eab308", "Ideas",          "categoryName.ideas");
register(e(0x1F30D),        "globe-outline",      "#0284c7", "International",  "categoryName.international");
register(e(0x1F389),        "calendar-outline",   "#d946ef", "Events",         "categoryName.events");
register(e(0x1F680),        "rocket-outline",     "#6366f1", "Startup",        "categoryName.startup");
register(e(0x1F4CA),        "stats-chart-outline", "#059669", "Analytics",     "categoryName.analytics");
register(e(0x1F5FA),        "map-outline",        "#0ea5e9", "Maps",           "categoryName.maps");
register(e(0x1F6D2 + 1),    "storefront-outline", "#f97316", "Store",         "categoryName.store");
register(e(0x1F4B5),        "wallet-outline",     "#16a34a", "Savings",        "categoryName.savings");
register(e(0x1F50D),        "search-outline",     "#71717a", "Research",       "categoryName.research");
register(e(0x1F3B6),        "headset-outline",    "#7c3aed", "Podcast",        "categoryName.podcast");
register(e(0x1F5C4),        "archive-outline",    "#78716c", "Storage",        "categoryName.storage");
register(e(0x1F6B2),        "bicycle-outline",    "#059669", "Cycling",        "categoryName.cycling");

const FALLBACK_ICON: EmojiIcon = { icon: "cube-outline", color: "#71717a", label: "Others", i18nKey: "categoryName.others" };

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

// Extended icon list (for category management page)
export const ALL_CATEGORY_ICONS: { emoji: string; icon: EmojiIcon }[] = [
  e(0x1F354), e(0x1F6D2), e(0x2615), e(0x1F697), e(0x26FD), e(0x1F3E0),
  e(0x1F48A), e(0x1F3AE), e(0x1F455), e(0x1F4F1), e2(0x2708, 0xFE0F), e(0x1F393),
  e(0x1F4B0), e(0x1F4B3), e(0x1F43E), e(0x1F476), e(0x1F487), e(0x1F381),
  e2(0x1F3CB, 0xFE0F), e(0x1F4E6),
  e(0x1F3B5), e(0x1F4DA), e(0x1F4BB), e(0x1F3E2), e(0x1F37D), e(0x1F6BF),
  e(0x1F4F0), e(0x1F3A8), e(0x1F4B8), e(0x1F4C8), e(0x1F3D5), e(0x1F6E0),
  e(0x1F4F7), e(0x1F3AC), e(0x26BD), e(0x1F4E7), e(0x1F48E), e(0x1F6E1),
  e(0x2764), e(0x1F3C6),
  e(0x1F3E5), e(0x1F4D6), e(0x1F3B2), e(0x1F527), e(0x1F3E8), e(0x1F37A),
  e(0x1F4E2), e(0x1F4BC), e(0x1F392), e(0x1F4DD), e(0x1F512), e(0x1F4A1),
  e(0x1F30D), e(0x1F389), e(0x1F680), e(0x1F4CA), e(0x1F5FA), e(0x1F6D2 + 1),
  e(0x1F4B5), e(0x1F50D),
  e(0x1F3B6), e(0x1F5C4), e(0x1F6B2),
].map((emoji) => ({ emoji, icon: getEmojiIcon(emoji) }));
