export const EMOJI_TO_NAME: Record<string, string> = {
  "🍔": "Food & Dining",
  "🛒": "Groceries",
  "☕": "Coffee",
  "🚗": "Transportation",
  "⛽": "Gas",
  "🏠": "Housing",
  "💊": "Health",
  "🎮": "Entertainment",
  "👕": "Shopping",
  "📱": "Subscriptions",
  "✈️": "Travel",
  "🎓": "Education",
  "💰": "Income",
  "💳": "Bills",
  "🐾": "Pets",
  "👶": "Kids",
  "💇": "Personal Care",
  "🎁": "Gifts",
  "🏋️": "Fitness",
  "📦": "Others",
};

export const DEFAULT_EMOJIS = [
  "🍔", "🛒", "☕", "🚗", "⛽", "🏠",
  "💊", "🎮", "👕", "📱", "✈️", "🎓",
  "💰", "💳", "🐾", "👶", "💇", "🎁",
  "🏋️", "📦",
];

export const TAG_COLORS = [
  "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71",
  "#1abc9c", "#3498db", "#9b59b6", "#e84393",
  "#00b894", "#0984e3", "#6c5ce7", "#fd79a8",
  "#d63031", "#e17055", "#00cec9", "#636e72",
];

export function randomTagColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
}

export function textColorForBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export const ACCOUNT_COLORS = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
  "#ef4444", "#14b8a6", "#f97316", "#6366f1",
  "#ec4899", "#06b6d4",
];

export const UNCATEGORIZED_ID = "__uncategorized__";
