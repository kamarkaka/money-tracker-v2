import type { ApiClient } from "./client";
import type { BudgetBucket, CreateBudgetInput, UpdateBudgetInput } from "@money-tracker/shared";

export function createBudgetApi(client: ApiClient) {
  return {
    async list(): Promise<BudgetBucket[]> {
      return client.get<BudgetBucket[]>("/api/budget-buckets");
    },

    async create(data: CreateBudgetInput): Promise<BudgetBucket> {
      return client.post<BudgetBucket>("/api/budget-buckets", data);
    },

    async update(id: string, data: UpdateBudgetInput): Promise<BudgetBucket> {
      return client.put<BudgetBucket>(`/api/budget-buckets/${id}`, data);
    },

    async remove(id: string): Promise<void> {
      await client.delete(`/api/budget-buckets/${id}`);
    },
  };
}
