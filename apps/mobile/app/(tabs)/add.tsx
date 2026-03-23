import { Redirect } from "expo-router";

// This screen is never shown — the tab button opens the modal directly.
// This file exists only because Expo Router requires a file for each tab.
export default function AddPlaceholder() {
  return <Redirect href="/(tabs)/overview" />;
}
