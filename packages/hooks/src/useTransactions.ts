import { useState, useCallback } from "react";
import { createTransactionApi } from "@money-tracker/api-client";
import type {
  Transaction,
  TransactionFilters,
  CreateTransactionInput,
  UpdateTransactionInput,
} from "@money-tracker/shared";
import { useApiClient } from "./useApiClient";

interface UseTransactionsResult {
  transactions: Transaction[];
  total: number;
  loading: boolean;
  fetch: (filters?: TransactionFilters, append?: boolean) => Promise<void>;
  create: (data: CreateTransactionInput) => Promise<Transaction>;
  update: (id: string, data: UpdateTransactionInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useTransactions(): UseTransactionsResult {
  const client = useApiClient();
  const api = createTransactionApi(client);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async (filters: TransactionFilters = {}, append = false) => {
    setLoading(true);
    const data = await api.list(filters);
    if (append) {
      setTransactions((prev) => [...prev, ...data.transactions]);
    } else {
      setTransactions(data.transactions);
    }
    setTotal(data.total);
    setLoading(false);
  }, [api]);

  const create = useCallback(async (data: CreateTransactionInput) => {
    return api.create(data);
  }, [api]);

  const update = useCallback(async (id: string, data: UpdateTransactionInput) => {
    await api.update(id, data);
  }, [api]);

  const remove = useCallback(async (id: string) => {
    await api.remove(id);
  }, [api]);

  return { transactions, total, loading, fetch: fetchTransactions, create, update, remove };
}
