import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Money Tracker 2",
  slug: "money-tracker-2",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  scheme: "money-tracker-2",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "xyz.mengcao.money-tracker-2",
    buildNumber: "1",
    infoPlist: {
      NSPhotoLibraryUsageDescription: "Used to export financial data files.",
    },
  },
  plugins: ["expo-router", "expo-secure-store", "expo-sqlite", "expo-document-picker"],
});
