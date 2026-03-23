import { useState, useCallback } from "react";
import { createCategoryApi } from "@money-tracker/api-client";
import type { Category, CreateCategoryInput } from "@money-tracker/shared";
import { useApiClient } from "./useApiClient";

interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
  fetch: () => Promise<void>;
  create: (data: CreateCategoryInput) => Promise<Category>;
  update: (id: string, data: Partial<CreateCategoryInput>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useCategories(): UseCategoriesResult {
  const client = useApiClient();
  const api = createCategoryApi(client);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const data = await api.list();
    setCategories(data);
    setLoading(false);
  }, [api]);

  const create = useCallback(async (data: CreateCategoryInput) => {
    return api.create(data);
  }, [api]);

  const update = useCallback(async (id: string, data: Partial<CreateCategoryInput>) => {
    await api.update(id, data);
  }, [api]);

  const remove = useCallback(async (id: string) => {
    await api.remove(id);
  }, [api]);

  return { categories, loading, fetch: fetchCategories, create, update, remove };
}
