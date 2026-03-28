import { useState, useCallback } from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import {
  create as createPlaidLink,
  open as openPlaidLink,
  LinkSuccess,
  LinkExit,
} from "react-native-plaid-link-sdk";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";
import { getDatabase } from "@/lib/db";
import { createLinkToken, exchangePublicToken, getInstitutionName } from "@/lib/plaid/api";
import { savePlaidToken, getOrCreateClientUserId } from "@/lib/plaid/storage";
import { syncPlaidItem } from "@/lib/plaid/sync";

interface PlaidLinkProps {
  onSuccess: () => void;
  onDismiss?: () => void;
}

export function PlaidLinkButton({ onSuccess, onDismiss }: PlaidLinkProps) {
  const { theme } = useAppTheme();
  const { i18n } = useI18n();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handlePress = useCallback(async () => {
    setLoading(true);
    try {
      const clientUserId = await getOrCreateClientUserId();
      const linkToken = await createLinkToken(clientUserId);

      // Step 1: Create the Plaid Link session
      createPlaidLink({ token: linkToken });

      // Step 2: Open Plaid Link UI
      openPlaidLink({
        onSuccess: async (success: LinkSuccess) => {
          setSyncing(true);
          try {
            const { accessToken, itemId } = await exchangePublicToken(
              success.publicToken,
            );
            await savePlaidToken(itemId, accessToken);

            // Get institution name from metadata or Plaid API
            let institutionName = success.metadata?.institution?.name ?? "";
            if (!institutionName && success.metadata?.institution?.id) {
              try {
                institutionName = await getInstitutionName(
                  success.metadata.institution.id,
                );
              } catch {
                institutionName = "Linked Institution";
              }
            }
            if (!institutionName) institutionName = "Linked Institution";

            const db = await getDatabase();
            await syncPlaidItem(db, itemId, institutionName, accessToken);
            onSuccess();
          } catch (err) {
            Alert.alert(
              i18n("common.error"),
              err instanceof Error ? err.message : "Failed to sync accounts",
            );
          } finally {
            setSyncing(false);
          }
        },
        onExit: (_exit: LinkExit) => {
          onDismiss?.();
        },
      });
    } catch (err) {
      Alert.alert(
        i18n("common.error"),
        err instanceof Error ? err.message : "Failed to open Plaid Link",
      );
    } finally {
      setLoading(false);
    }
  }, [i18n, onSuccess, onDismiss]);

  const isDisabled = loading || syncing;
  const label = syncing
    ? i18n("account.syncing")
    : i18n("account.linkBank");

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: theme.accent,
          opacity: isDisabled ? 0.6 : 1,
        },
      ]}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {isDisabled ? (
        <ActivityIndicator size="small" color={theme.accentText} />
      ) : (
        <Ionicons name="link-outline" size={20} color={theme.accentText} />
      )}
      <Text style={[styles.label, { color: theme.accentText }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
});
