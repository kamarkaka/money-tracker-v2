import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { getDatabase } from "./database";

export interface ExportData {
  version: number;
  exportedAt: string;
  data: {
    institutions: {
      id: string;
      name: string;
      isManual: boolean;
    }[];
    accounts: {
      id: string;
      institutionId: string;
      name: string;
      type: string;
      subtype: string | null;
      balance: number;
      currency: string;
      isHidden: boolean;
      isManual: boolean;
    }[];
    categories: {
      id: string;
      name: string;
      emoji: string | null;
      parentId: string | null;
    }[];
    transactions: {
      id: string;
      accountId: string;
      categoryId: string | null;
      description: string;
      amount: number;
      date: string;
      isHidden: boolean;
      isManual: boolean;
      tagIds: string[];
    }[];
    tags: {
      id: string;
      name: string;
      color: string;
    }[];
    budgets: {
      id: string;
      name: string;
      icon: string | null;
      amount: number;
      categoryIds: string[];
    }[];
    categoryRules: {
      id: string;
      sequence: number;
      match: string;
      categoryId: string;
    }[];
    settings: {
      theme: string;
      language: string;
      mode: string;
    };
  };
}

export async function buildExportData(): Promise<ExportData> {
  const db = await getDatabase();

  const institutions = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM institutions",
  );
  const accounts = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM accounts",
  );
  const categories = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM categories",
  );
  const transactions = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM transactions",
  );
  const tags = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM tags",
  );
  const transactionTags = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM transaction_tags",
  );
  const budgets = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM budgets",
  );
  const budgetCategories = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM budget_categories",
  );
  const rules = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM category_rules ORDER BY sequence",
  );
  const settings = await db.getFirstAsync<Record<string, unknown>>(
    "SELECT * FROM settings WHERE id = 'default'",
  );

  // Build tag lookup per transaction
  const txTagMap: Record<string, string[]> = {};
  for (const tt of transactionTags) {
    const txId = tt.transaction_id as string;
    if (!txTagMap[txId]) txTagMap[txId] = [];
    txTagMap[txId].push(tt.tag_id as string);
  }

  // Build category lookup per budget
  const budgetCatMap: Record<string, string[]> = {};
  for (const bc of budgetCategories) {
    const bId = bc.budget_id as string;
    if (!budgetCatMap[bId]) budgetCatMap[bId] = [];
    budgetCatMap[bId].push(bc.category_id as string);
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      institutions: institutions.map((r) => ({
        id: r.id as string,
        name: r.name as string,
        isManual: !!(r.is_manual as number),
      })),
      accounts: accounts.map((r) => ({
        id: r.id as string,
        institutionId: r.institution_id as string,
        name: r.name as string,
        type: r.type as string,
        subtype: (r.subtype as string) || null,
        balance: r.balance as number,
        currency: r.currency as string,
        isHidden: !!(r.is_hidden as number),
        isManual: !!(r.is_manual as number),
      })),
      categories: categories.map((r) => ({
        id: r.id as string,
        name: r.name as string,
        emoji: (r.emoji as string) || null,
        parentId: (r.parent_id as string) || null,
      })),
      transactions: transactions.map((r) => ({
        id: r.id as string,
        accountId: r.account_id as string,
        categoryId: (r.category_id as string) || null,
        description: r.description as string,
        amount: r.amount as number,
        date: r.date as string,
        isHidden: !!(r.is_hidden as number),
        isManual: !!(r.is_manual as number),
        tagIds: txTagMap[r.id as string] || [],
      })),
      tags: tags.map((r) => ({
        id: r.id as string,
        name: r.name as string,
        color: r.color as string,
      })),
      budgets: budgets.map((r) => ({
        id: r.id as string,
        name: r.name as string,
        icon: (r.icon as string) || null,
        amount: r.amount as number,
        categoryIds: budgetCatMap[r.id as string] || [],
      })),
      categoryRules: rules.map((r) => ({
        id: r.id as string,
        sequence: r.sequence as number,
        match: r.match as string,
        categoryId: r.category_id as string,
      })),
      settings: {
        theme: (settings?.theme as string) || "system",
        language: (settings?.language as string) || "en",
        mode: (settings?.mode as string) || "casual",
      },
    },
  };
}

export async function exportToFile(): Promise<void> {
  const data = await buildExportData();
  const json = JSON.stringify(data, null, 2);

  const filename = `money-tracker-export-${new Date().toISOString().split("T")[0]}.json`;
  const file = new File(Paths.cache, filename);
  file.create();
  file.write(json);

  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    dialogTitle: "Export Money Tracker Data",
    UTI: "public.json",
  });
}
