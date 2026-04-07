import { useState, useCallback } from "react";
import {
  View,
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
    <View style={[styles.card, { backgroundColor: theme.accent, borderColor: theme.accent, opacity: isDisabled ? 0.6 : 1 }]}>
      <TouchableOpacity
        style={styles.cardInner}
        onPress={handlePress}
        disabled={isDisabled}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          {isDisabled ? (
            <ActivityIndicator size="small" color={theme.accentText} />
          ) : (
            <Ionicons name="business-outline" size={20} color={theme.accentText} />
          )}
          <Text style={[styles.label, { color: theme.accentText }]}>
            {label}
          </Text>
        </View>
        <Text style={[styles.disclaimer, { color: theme.accentText + "99" }]}>
          {i18n("account.linkBankDisclaimer")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  label: {
    fontSize: 18,
    fontWeight: "700",
  },
  disclaimer: {
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
});
