import { ExpoConfig, ConfigContext } from "expo/config";

const now = new Date();
const buildNumber = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Money Tracker 2",
  slug: "money-tracker-2",
  version: "2.3.2",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  scheme: "money-tracker-2",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "xyz.mengcao.money-tracker-2",
    buildNumber,
    icon: {
      light: "./assets/icon.png",
      dark: "./assets/icon-dark.png",
      tinted: "./assets/icon-tint.png",
    },
    infoPlist: {
      NSPhotoLibraryUsageDescription: "Used to export financial data files.",
    },
  },
  extra: {
    eas: {
      projectId: "d838744b-1862-4e19-9179-a81b0376ff6b",
    },
    devMode: process.env.DEV_MODE === "true",
    PLAID_BACKEND_URL: process.env.PLAID_BACKEND_URL || "http://localhost:3001",
  },
  plugins: ["expo-router", "expo-secure-store", "expo-sqlite", "expo-document-picker"],
});
