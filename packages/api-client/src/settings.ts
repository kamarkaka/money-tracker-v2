import type { ApiClient } from "./client";
import type { UserSetting, UserProfile } from "@money-tracker/shared";

export function createSettingsApi(client: ApiClient) {
  return {
    async get(): Promise<UserSetting> {
      return client.get<UserSetting>("/api/setting");
    },

    async update(data: Partial<UserSetting>): Promise<UserSetting> {
      return client.put<UserSetting>("/api/setting", data);
    },
  };
}

export function createProfileApi(client: ApiClient) {
  return {
    async get(): Promise<UserProfile> {
      return client.get<UserProfile>("/api/profile");
    },

    async update(data: { name?: string }): Promise<UserProfile> {
      return client.put<UserProfile>("/api/profile", data);
    },
  };
}
