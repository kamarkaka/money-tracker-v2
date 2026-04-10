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
import { useFocusEffect } from "expo-router";
import { useAppTheme } from "@/lib/themeContext";
import { useI18n } from "@/lib/i18n";
import { getDatabase } from "@/lib/db";
import { createLinkToken, exchangePublicToken, getInstitutionName } from "@/lib/plaid/api";
import { savePlaidToken, getOrCreateClientUserId, getPlaidCredentials } from "@/lib/plaid/storage";
import { syncPlaidItem } from "@/lib/plaid/sync";
import { getPlaidMode, type PlaidMode } from "@/lib/plaid/mode";
import { createLinkTokenViaBackend, exchangeViaBackend } from "@/lib/plaid/backend-client";
import { ingestBackendExchange } from "@/lib/plaid/backend-sync";

interface PlaidLinkProps {
  onSuccess: () => void;
  onDismiss?: () => void;
}

export function PlaidLinkButton({ onSuccess, onDismiss }: PlaidLinkProps) {
  const { theme } = useAppTheme();
  const { i18n } = useI18n();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [plaidMode, setPlaidMode] = useState<PlaidMode | null>(null);

  // Re-check mode each time the screen gains focus
  // (e.g. after navigating to Settings to log in or enter Plaid credentials)
  useFocusEffect(useCallback(() => {
    getPlaidMode().then((mode) => {
      setPlaidMode((prev) => prev === mode ? prev : mode);
    });
  }, []));

  const handleDirectLink = useCallback(async () => {
    const creds = await getPlaidCredentials();
    if (!creds) {
      Alert.alert(i18n("account.plaidNotConfigured"), i18n("account.plaidNotConfiguredDesc"));
      return;
    }

    setLoading(true);
    try {
      const clientUserId = await getOrCreateClientUserId();
      const linkToken = await createLinkToken(creds, clientUserId);

      createPlaidLink({ token: linkToken });

      openPlaidLink({
        onSuccess: async (success: LinkSuccess) => {
          setSyncing(true);
          try {
            const { accessToken, itemId } = await exchangePublicToken(creds, success.publicToken);
            await savePlaidToken(itemId, accessToken);

            let institutionName = success.metadata?.institution?.name ?? "";
            if (!institutionName && success.metadata?.institution?.id) {
              try {
                institutionName = await getInstitutionName(creds, success.metadata.institution.id);
              } catch {
                institutionName = "Linked Institution";
              }
            }
            if (!institutionName) institutionName = "Linked Institution";

            const db = await getDatabase();
            await syncPlaidItem(db, itemId, institutionName, accessToken);
            onSuccess();
          } catch (err) {
            Alert.alert(i18n("common.error"), err instanceof Error ? err.message : "Failed to sync accounts");
          } finally {
            setSyncing(false);
          }
        },
        onExit: (_exit: LinkExit) => {
          onDismiss?.();
        },
      });
    } catch (err) {
      Alert.alert(i18n("common.error"), err instanceof Error ? err.message : "Failed to open Plaid Link");
    } finally {
      setLoading(false);
    }
  }, [i18n, onSuccess, onDismiss]);

  const handleBackendLink = useCallback(async () => {
    setLoading(true);
    try {
      const linkToken = await createLinkTokenViaBackend();

      createPlaidLink({ token: linkToken });

      openPlaidLink({
        onSuccess: async (success: LinkSuccess) => {
          setSyncing(true);
          try {
            const institutionName = success.metadata?.institution?.name || "Linked Institution";
            const result = await exchangeViaBackend(success.publicToken, institutionName);

            const db = await getDatabase();
            await ingestBackendExchange(db, result);
            onSuccess();
          } catch (err) {
            const code = (err as Error & { code?: string }).code;
            if (code === "SUBSCRIPTION_EXPIRED") {
              Alert.alert(i18n("common.error"), i18n("account.subscriptionRequired"));
            } else {
              Alert.alert(i18n("common.error"), err instanceof Error ? err.message : "Failed to sync accounts");
            }
          } finally {
            setSyncing(false);
          }
        },
        onExit: (_exit: LinkExit) => {
          onDismiss?.();
        },
      });
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (code === "SUBSCRIPTION_EXPIRED") {
        Alert.alert(i18n("common.error"), i18n("account.subscriptionRequired"));
      } else {
        Alert.alert(i18n("common.error"), err instanceof Error ? err.message : "Failed to open Plaid Link");
      }
    } finally {
      setLoading(false);
    }
  }, [i18n, onSuccess, onDismiss]);

  const handlePress = useCallback(async () => {
    const mode = await getPlaidMode();
    if (mode === "backend") {
      await handleBackendLink();
    } else if (mode === "direct") {
      await handleDirectLink();
    } else {
      Alert.alert(i18n("account.plaidNotConfigured"), i18n("account.plaidNotConfiguredDesc"));
    }
  }, [handleDirectLink, handleBackendLink, i18n]);

  const isAvailable = plaidMode !== "none";
  const label = syncing ? i18n("account.syncing") : i18n("account.linkBank");

  return (
    <View style={[styles.card, {
      backgroundColor: !isAvailable ? theme.cardBorder : theme.accent,
      borderColor: !isAvailable ? theme.cardBorder : theme.accent,
      opacity: loading || syncing ? 0.6 : 1,
    }]}>
      <TouchableOpacity
        style={styles.cardInner}
        onPress={handlePress}
        disabled={loading || syncing}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          {(loading || syncing) ? (
            <ActivityIndicator size="small" color={theme.accentText} />
          ) : (
            <Ionicons name="business-outline" size={20} color={!isAvailable ? theme.textSecondary : theme.accentText} />
          )}
          <Text style={[styles.label, { color: !isAvailable ? theme.textSecondary : theme.accentText }]}>
            {label}
          </Text>
        </View>
        <Text style={[styles.disclaimer, { color: !isAvailable ? theme.textSecondary + "99" : theme.accentText + "99" }]}>
          {!isAvailable
            ? i18n("account.plaidNotConfiguredShort")
            : plaidMode === "backend"
              ? i18n("account.linkBankViaBackend")
              : i18n("account.linkBankDisclaimer")}
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
  cardInner: {},
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
