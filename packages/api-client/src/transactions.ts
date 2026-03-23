import type { ApiClient } from "./client";
import type {
  Transaction,
  TransactionFilters,
  TransactionListResponse,
  CreateTransactionInput,
  UpdateTransactionInput,
} from "@money-tracker/shared";

export function createTransactionApi(client: ApiClient) {
  return {
    async list(filters: TransactionFilters = {}): Promise<TransactionListResponse> {
      const params = new URLSearchParams();
      if (filters.includeHidden) params.set("includeHidden", "true");
      if (filters.page) params.set("page", String(filters.page));
      if (filters.pageSize !== undefined) params.set("pageSize", String(filters.pageSize));
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
      if (filters.search) params.set("search", filters.search);
      if (filters.accountId) params.set("accountId", filters.accountId);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.minAmount) params.set("minAmount", filters.minAmount);
      if (filters.maxAmount) params.set("maxAmount", filters.maxAmount);

      const qs = params.toString();
      return client.get<TransactionListResponse>(`/api/transaction${qs ? `?${qs}` : ""}`);
    },

    async create(data: CreateTransactionInput): Promise<Transaction> {
      return client.post<Transaction>("/api/transaction", data);
    },

    async update(id: string, data: UpdateTransactionInput): Promise<Transaction> {
      return client.put<Transaction>(`/api/transaction/${id}`, data);
    },

    async remove(id: string): Promise<void> {
      await client.delete(`/api/transaction/${id}`);
    },
  };
}
