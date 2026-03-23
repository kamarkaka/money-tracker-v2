// Core domain types shared across web and mobile

export interface Transaction {
  id: string;
  description: string;
  amount: string | number;
  date: string;
  categoryId: string | null;
  isHidden: boolean;
  isManual: boolean;
  account: { id: string; name: string; institution?: { name: string } };
  category: {
    id: string;
    name: string;
    emoji?: string | null;
    parent?: { id: string; name: string } | null;
  } | null;
  transactionTags?: { tag: Tag }[];
}

export interface Category {
  id: string;
  name: string;
  emoji?: string | null;
  parentId: string | null;
  children?: Category[];
  budgetCategory?: {
    budget: { id: string; name: string };
  } | null;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  subtype?: string | null;
  balance: string | number;
  currency: string;
  isHidden?: boolean;
  isManual?: boolean;
  institution?: { id: string; name: string };
}

export interface Institution {
  id: string;
  name: string;
  isManual: boolean;
  accounts: Account[];
}

export interface BudgetBucket {
  id: string;
  name: string;
  icon?: string | null;
  amount: string | number;
  categories: { category: { id: string; name: string } }[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface UserSetting {
  theme: "light" | "dark" | "system";
  language: string;
  mode: "pro" | "casual";
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  hasCompletedTutorial: boolean;
  authProvider: string;
}

// API request/response types

export interface TransactionFilters {
  search?: string;
  accountId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: string;
  maxAmount?: string;
  includeHidden?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateTransactionInput {
  accountId: string;
  description?: string;
  amount: number;
  date: string;
  categoryId?: string | null;
  tagIds?: string[];
  emoji?: string;
}

export interface UpdateTransactionInput {
  description?: string;
  amount?: number;
  date?: string;
  categoryId?: string | null;
  accountId?: string;
  isHidden?: boolean;
}

export interface CreateCategoryInput {
  name: string;
  parentId?: string | null;
}

export interface CreateBudgetInput {
  name: string;
  icon?: string;
  amount?: number;
  categoryIds?: string[];
}

export interface UpdateBudgetInput {
  name?: string;
  icon?: string;
  amount?: number;
  categoryIds?: string[];
}

export interface BucketGroup {
  bucketName: string;
  bucketIcon?: string | null;
  budgetAmount: number;
  transactions: Transaction[];
  total: number;
}
