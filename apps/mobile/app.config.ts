import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Money Tracker 2",
  slug: "money-tracker-2",
  version: "2.2.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  scheme: "money-tracker-2",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "xyz.mengcao.money-tracker-2",
    buildNumber: "202604071455",
    infoPlist: {
      NSPhotoLibraryUsageDescription: "Used to export financial data files.",
    },
  },
  extra: {
    eas: {
      projectId: "d838744b-1862-4e19-9179-a81b0376ff6b",
    },
    plaidClientId: process.env.PLAID_CLIENT_ID ?? "",
    plaidSecret: process.env.PLAID_SECRET ?? "",
    plaidEnv: process.env.PLAID_ENV ?? "sandbox",
    devMode: process.env.EXPO_PUBLIC_DEV_MODE === "true",
  },
  plugins: ["expo-router", "expo-secure-store", "expo-sqlite", "expo-document-picker"],
});
