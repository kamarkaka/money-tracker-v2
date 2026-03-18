export const SUPPORTED_LOCALES = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇺🇸" },
  { code: "zh", label: "Chinese (Simplified)", nativeLabel: "简体中文", flag: "🇨🇳" },
  { code: "es", label: "Spanish", nativeLabel: "Español", flag: "🇪🇸" },
  { code: "fr", label: "French", nativeLabel: "Français", flag: "🇫🇷" },
] as const;

export const DEFAULT_LOCALE = "en";
export type Locale = (typeof SUPPORTED_LOCALES)[number]["code"];

export function isValidLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.some((l) => l.code === locale);
}
