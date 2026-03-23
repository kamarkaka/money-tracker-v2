import type { ApiClient } from "./client";
import type { Tag } from "@money-tracker/shared";

export function createTagApi(client: ApiClient) {
  return {
    async list(): Promise<Tag[]> {
      return client.get<Tag[]>("/api/tags");
    },

    async create(data: { name: string; color: string }): Promise<Tag> {
      return client.post<Tag>("/api/tags", data);
    },

    async update(id: string, data: { name?: string; color?: string }): Promise<Tag> {
      return client.put<Tag>(`/api/tags/${id}`, data);
    },

    async remove(id: string): Promise<void> {
      await client.delete(`/api/tags/${id}`);
    },
  };
}
