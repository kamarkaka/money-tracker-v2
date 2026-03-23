import { useState, useCallback } from "react";
import { createSettingsApi, createProfileApi } from "@money-tracker/api-client";
import type { UserSetting, UserProfile } from "@money-tracker/shared";
import { useApiClient } from "./useApiClient";

interface UseSettingsResult {
  settings: UserSetting | null;
  loading: boolean;
  fetch: () => Promise<void>;
  update: (data: Partial<UserSetting>) => Promise<void>;
}

export function useSettings(): UseSettingsResult {
  const client = useApiClient();
  const api = createSettingsApi(client);
  const [settings, setSettings] = useState<UserSetting | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const data = await api.get();
    setSettings(data);
    setLoading(false);
  }, [api]);

  const update = useCallback(async (data: Partial<UserSetting>) => {
    const updated = await api.update(data);
    setSettings(updated);
  }, [api]);

  return { settings, loading, fetch: fetchSettings, update };
}

interface UseProfileResult {
  profile: UserProfile | null;
  loading: boolean;
  fetch: () => Promise<void>;
  update: (data: { name?: string }) => Promise<void>;
}

export function useProfile(): UseProfileResult {
  const client = useApiClient();
  const api = createProfileApi(client);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const data = await api.get();
    setProfile(data);
    setLoading(false);
  }, [api]);

  const update = useCallback(async (data: { name?: string }) => {
    const updated = await api.update(data);
    setProfile(updated);
  }, [api]);

  return { profile, loading, fetch: fetchProfile, update };
}
