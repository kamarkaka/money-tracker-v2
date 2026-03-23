import { useState, useCallback } from "react";
import { createBudgetApi } from "@money-tracker/api-client";
import type { BudgetBucket, CreateBudgetInput, UpdateBudgetInput } from "@money-tracker/shared";
import { useApiClient } from "./useApiClient";

interface UseBudgetsResult {
  budgets: BudgetBucket[];
  loading: boolean;
  fetch: () => Promise<void>;
  create: (data: CreateBudgetInput) => Promise<BudgetBucket>;
  update: (id: string, data: UpdateBudgetInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useBudgets(): UseBudgetsResult {
  const client = useApiClient();
  const api = createBudgetApi(client);
  const [budgets, setBudgets] = useState<BudgetBucket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    const data = await api.list();
    setBudgets(data);
    setLoading(false);
  }, [api]);

  const create = useCallback(async (data: CreateBudgetInput) => {
    return api.create(data);
  }, [api]);

  const update = useCallback(async (id: string, data: UpdateBudgetInput) => {
    await api.update(id, data);
  }, [api]);

  const remove = useCallback(async (id: string) => {
    await api.remove(id);
  }, [api]);

  return { budgets, loading, fetch: fetchBudgets, create, update, remove };
}
