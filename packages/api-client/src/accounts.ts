import type { ApiClient } from "./client";
import type { Account, Institution } from "@money-tracker/shared";

export function createAccountApi(client: ApiClient) {
  return {
    async list(): Promise<Account[]> {
      return client.get<Account[]>("/api/account");
    },

    async update(id: string, data: { name?: string; isHidden?: boolean }): Promise<Account> {
      return client.put<Account>(`/api/account/${id}`, data);
    },
  };
}

export function createInstitutionApi(client: ApiClient) {
  return {
    async list(): Promise<Institution[]> {
      return client.get<Institution[]>("/api/institution");
    },

    async remove(id: string): Promise<void> {
      await client.delete(`/api/institution/${id}`);
    },

    async refresh(id: string): Promise<void> {
      await client.post(`/api/institution/${id}/refresh`, {});
    },
  };
}
