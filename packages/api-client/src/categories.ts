import type { ApiClient } from "./client";
import type { Category, CreateCategoryInput } from "@money-tracker/shared";

export function createCategoryApi(client: ApiClient) {
  return {
    async list(): Promise<Category[]> {
      return client.get<Category[]>("/api/category");
    },

    async create(data: CreateCategoryInput): Promise<Category> {
      return client.post<Category>("/api/category", data);
    },

    async update(id: string, data: Partial<CreateCategoryInput>): Promise<Category> {
      return client.put<Category>(`/api/category/${id}`, data);
    },

    async remove(id: string): Promise<void> {
      await client.delete(`/api/category/${id}`);
    },
  };
}
