// Default emoji → category name mapping
// Used when creating a new category on-the-fly for casual mode
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

// Default emojis shown in the picker (ordered)
export const DEFAULT_EMOJIS = [
  "🍔", "🛒", "☕", "🚗", "⛽", "🏠",
  "💊", "🎮", "👕", "📱", "✈️", "🎓",
  "💰", "💳", "🐾", "👶", "💇", "🎁",
  "🏋️", "📦",
];
