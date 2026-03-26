import { ApiClient } from "@money-tracker/api-client";
import { EMOJI_TO_NAME } from "@money-tracker/shared";
import { getDatabase, uuid } from "./database";

function parsePath(fullPath: string): { path: string; params: URLSearchParams } {
  const [path, qs] = fullPath.split("?");
  return { path, params: new URLSearchParams(qs || "") };
}

function matchPath(
  path: string,
  pattern: string,
): Record<string, string> | null {
  const pathParts = path.split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);
  if (pathParts.length !== patternParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

export class LocalClient extends ApiClient {
  constructor() {
    super({ baseUrl: "" });
  }

  async request<T>(fullPath: string, options: RequestInit = {}): Promise<T> {
    const method = (options.method || "GET").toUpperCase();
    const { path, params } = parsePath(fullPath);
    const body = options.body ? JSON.parse(options.body as string) : undefined;

    let match: Record<string, string> | null;

    // Transactions
    if (method === "GET" && path === "/api/transaction")
      return this.listTransactions(params) as T;
    if (method === "POST" && path === "/api/transaction")
      return this.createTransaction(body) as T;
    match = matchPath(path, "/api/transaction/:id");
    if (match) {
      if (method === "PUT") return this.updateTransaction(match.id, body) as T;
      if (method === "DELETE")
        return this.deleteTransaction(match.id) as T;
    }

    // Categories
    if (method === "GET" && path === "/api/category")
      return this.listCategories() as T;
    if (method === "POST" && path === "/api/category")
      return this.createCategory(body) as T;
    match = matchPath(path, "/api/category/:id");
    if (match) {
      if (method === "PUT") return this.updateCategory(match.id, body) as T;
      if (method === "DELETE") return this.deleteCategory(match.id) as T;
    }

    // Accounts
    if (method === "GET" && path === "/api/account")
      return this.listAccounts() as T;
    if (method === "POST" && path === "/api/account")
      return this.createAccount(body) as T;
    match = matchPath(path, "/api/account/:id");
    if (match) {
      if (method === "PUT") return this.updateAccount(match.id, body) as T;
      if (method === "DELETE") return this.deleteAccount(match.id) as T;
    }

    // Institutions
    if (method === "GET" && path === "/api/institution")
      return this.listInstitutions() as T;
    if (method === "POST" && path === "/api/institution")
      return this.createInstitution(body) as T;
    match = matchPath(path, "/api/institution/:id");
    if (match && method === "DELETE")
      return this.deleteInstitution(match.id) as T;
    match = matchPath(path, "/api/institution/:id/refresh");
    if (match && method === "POST") return undefined as T; // no-op

    // Budgets
    if (method === "GET" && path === "/api/budget-buckets")
      return this.listBudgets() as T;
    if (method === "POST" && path === "/api/budget-buckets")
      return this.createBudget(body) as T;
    match = matchPath(path, "/api/budget-buckets/:id");
    if (match) {
      if (method === "PUT") return this.updateBudget(match.id, body) as T;
      if (method === "DELETE") return this.deleteBudget(match.id) as T;
    }

    // Tags
    if (method === "GET" && path === "/api/tags")
      return this.listTags() as T;
    if (method === "POST" && path === "/api/tags")
      return this.createTag(body) as T;
    match = matchPath(path, "/api/tags/:id");
    if (match) {
      if (method === "PUT") return this.updateTag(match.id, body) as T;
      if (method === "DELETE") return this.deleteTag(match.id) as T;
    }

    // Settings
    if (path === "/api/setting") {
      if (method === "GET") return this.getSettings() as T;
      if (method === "PUT") return this.updateSettings(body) as T;
    }

    // Profile
    if (path === "/api/profile") {
      if (method === "GET") return this.getProfile() as T;
      if (method === "PUT") return this.updateProfile(body) as T;
    }

    // Rules
    if (method === "GET" && path === "/api/rules")
      return this.listRules() as T;
    if (method === "POST" && path === "/api/rules")
      return this.createRule(body) as T;
    match = matchPath(path, "/api/rules/:id");
    if (match) {
      if (method === "PUT") return this.updateRule(match.id, body) as T;
      if (method === "DELETE") return this.deleteRule(match.id) as T;
    }

    throw new Error(`Unhandled local route: ${method} ${path}`);
  }

  // ── Transactions ──────────────────────────────────────────

  private async listTransactions(params: URLSearchParams) {
    const db = await getDatabase();

    const conditions: string[] = [];
    const args: (string | number)[] = [];

    const startDate = params.get("startDate");
    const endDate = params.get("endDate");
    const accountId = params.get("accountId");
    const categoryId = params.get("categoryId");
    const search = params.get("search");
    const includeHidden = params.get("includeHidden") === "true";
    const page = parseInt(params.get("page") || "1");
    const pageSize = parseInt(params.get("pageSize") || "50");
    const sortBy = params.get("sortBy") || "date";
    const sortOrder = params.get("sortOrder") || "desc";

    if (!includeHidden) conditions.push("t.is_hidden = 0");
    if (startDate) {
      conditions.push("t.date >= ?");
      args.push(startDate);
    }
    if (endDate) {
      conditions.push("t.date <= ?");
      args.push(endDate);
    }
    if (accountId) {
      const ids = accountId.split(",");
      if (ids.length === 1) {
        conditions.push("t.account_id = ?");
        args.push(ids[0]);
      } else {
        conditions.push(`t.account_id IN (${ids.map(() => "?").join(",")})`);
        args.push(...ids);
      }
    }
    if (categoryId) {
      const ids = categoryId.split(",");
      if (ids.length === 1) {
        conditions.push("t.category_id = ?");
        args.push(ids[0]);
      } else {
        conditions.push(`t.category_id IN (${ids.map(() => "?").join(",")})`);
        args.push(...ids);
      }
    }
    if (search) {
      conditions.push("t.description LIKE ?");
      args.push(`%${search}%`);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) as c FROM transactions t ${where}`,
      args,
    );
    const total = countResult?.c || 0;

    const sortCol = sortBy === "amount" ? "t.amount" : "t.date";
    const order = sortOrder === "asc" ? "ASC" : "DESC";

    let limitClause = "";
    const queryArgs = [...args];
    if (pageSize > 0) {
      limitClause = "LIMIT ? OFFSET ?";
      queryArgs.push(pageSize, (page - 1) * pageSize);
    }

    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT t.id, t.description, t.amount, t.date, t.category_id,
              t.is_hidden, t.is_manual, t.account_id,
              a.id as acc_id, a.name as acc_name,
              i.name as inst_name,
              c.id as cat_id, c.name as cat_name, c.emoji as cat_emoji,
              cp.id as cat_parent_id, cp.name as cat_parent_name
       FROM transactions t
       LEFT JOIN accounts a ON t.account_id = a.id
       LEFT JOIN institutions i ON a.institution_id = i.id
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN categories cp ON c.parent_id = cp.id
       ${where}
       ORDER BY ${sortCol} ${order}, t.created_at DESC
       ${limitClause}`,
      queryArgs,
    );

    // Fetch tags for returned transactions
    const tagMap: Record<
      string,
      { tag: { id: string; name: string; color: string } }[]
    > = {};
    if (rows.length > 0) {
      const txIds = rows.map((r) => r.id as string);
      const placeholders = txIds.map(() => "?").join(",");
      const tagRows = await db.getAllAsync<Record<string, unknown>>(
        `SELECT tt.transaction_id, tg.id, tg.name, tg.color
         FROM transaction_tags tt
         JOIN tags tg ON tt.tag_id = tg.id
         WHERE tt.transaction_id IN (${placeholders})`,
        txIds,
      );
      for (const tr of tagRows) {
        const txId = tr.transaction_id as string;
        if (!tagMap[txId]) tagMap[txId] = [];
        tagMap[txId].push({
          tag: {
            id: tr.id as string,
            name: tr.name as string,
            color: tr.color as string,
          },
        });
      }
    }

    const transactions = rows.map((r) => ({
      id: r.id as string,
      description: r.description as string,
      amount: r.amount as number,
      date: r.date as string,
      categoryId: (r.category_id as string) || null,
      isHidden: !!(r.is_hidden as number),
      isManual: !!(r.is_manual as number),
      account: {
        id: r.acc_id as string,
        name: r.acc_name as string,
        institution: r.inst_name
          ? { name: r.inst_name as string }
          : undefined,
      },
      category: r.cat_id
        ? {
            id: r.cat_id as string,
            name: r.cat_name as string,
            emoji: (r.cat_emoji as string) || null,
            parent: r.cat_parent_id
              ? {
                  id: r.cat_parent_id as string,
                  name: r.cat_parent_name as string,
                }
              : null,
          }
        : null,
      transactionTags: tagMap[r.id as string] || [],
    }));

    return {
      transactions,
      total,
      page,
      pageSize: pageSize || total,
    };
  }

  private async getTransactionById(id: string) {
    const db = await getDatabase();

    const r = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT t.id, t.description, t.amount, t.date, t.category_id,
              t.is_hidden, t.is_manual, t.account_id,
              a.id as acc_id, a.name as acc_name,
              i.name as inst_name,
              c.id as cat_id, c.name as cat_name, c.emoji as cat_emoji,
              cp.id as cat_parent_id, cp.name as cat_parent_name
       FROM transactions t
       LEFT JOIN accounts a ON t.account_id = a.id
       LEFT JOIN institutions i ON a.institution_id = i.id
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN categories cp ON c.parent_id = cp.id
       WHERE t.id = ?`,
      [id],
    );
    if (!r) throw new Error("Transaction not found");

    const tagRows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT tg.id, tg.name, tg.color
       FROM transaction_tags tt
       JOIN tags tg ON tt.tag_id = tg.id
       WHERE tt.transaction_id = ?`,
      [id],
    );

    return {
      id: r.id as string,
      description: r.description as string,
      amount: r.amount as number,
      date: r.date as string,
      categoryId: (r.category_id as string) || null,
      isHidden: !!(r.is_hidden as number),
      isManual: !!(r.is_manual as number),
      account: {
        id: r.acc_id as string,
        name: r.acc_name as string,
        institution: r.inst_name
          ? { name: r.inst_name as string }
          : undefined,
      },
      category: r.cat_id
        ? {
            id: r.cat_id as string,
            name: r.cat_name as string,
            emoji: (r.cat_emoji as string) || null,
            parent: r.cat_parent_id
              ? {
                  id: r.cat_parent_id as string,
                  name: r.cat_parent_name as string,
                }
              : null,
          }
        : null,
      transactionTags: tagRows.map((tr) => ({
        tag: {
          id: tr.id as string,
          name: tr.name as string,
          color: tr.color as string,
        },
      })),
    };
  }

  private async createTransaction(body: Record<string, unknown>) {
    const db = await getDatabase();
    const id = uuid();

    let categoryId = (body.categoryId as string) || null;

    // If emoji is provided but no categoryId, find or create category
    if (!categoryId && body.emoji) {
      const cat = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM categories WHERE emoji = ?",
        [body.emoji as string],
      );
      if (cat) {
        categoryId = cat.id;
      } else {
        categoryId = uuid();
        const name =
          (EMOJI_TO_NAME as Record<string, string>)[body.emoji as string] ||
          "Other";
        await db.runAsync(
          "INSERT INTO categories (id, name, emoji) VALUES (?, ?, ?)",
          [categoryId, name, body.emoji as string],
        );
      }
    }

    // If still no category, try to match against rules based on description
    if (!categoryId) {
      const description = ((body.description as string) || "").toLowerCase().trim();
      if (description) {
        const rules = await db.getAllAsync<{ category_id: string; match: string }>(
          "SELECT category_id, match FROM category_rules ORDER BY sequence",
        );
        for (const rule of rules) {
          if (description.includes(rule.match.toLowerCase())) {
            categoryId = rule.category_id;
            break;
          }
        }
      }
    }

    await db.runAsync(
      `INSERT INTO transactions (id, account_id, category_id, description, amount, date, is_manual)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        body.accountId as string,
        categoryId,
        (body.description as string) || "",
        body.amount as number,
        body.date as string,
      ],
    );

    // Handle tagIds
    const tagIds = body.tagIds as string[] | undefined;
    if (tagIds?.length) {
      for (const tagId of tagIds) {
        await db.runAsync(
          "INSERT OR IGNORE INTO transaction_tags (id, transaction_id, tag_id) VALUES (?, ?, ?)",
          [uuid(), id, tagId],
        );
      }
    }

    return this.getTransactionById(id);
  }

  private async updateTransaction(
    id: string,
    body: Record<string, unknown>,
  ) {
    const db = await getDatabase();
    const sets: string[] = [];
    const args: (string | number)[] = [];

    if (body.description !== undefined) {
      sets.push("description = ?");
      args.push(body.description as string);
    }
    if (body.amount !== undefined) {
      sets.push("amount = ?");
      args.push(body.amount as number);
    }
    if (body.date !== undefined) {
      sets.push("date = ?");
      args.push(body.date as string);
    }
    if (body.categoryId !== undefined) {
      sets.push("category_id = ?");
      args.push(body.categoryId as string);
    }
    if (body.accountId !== undefined) {
      sets.push("account_id = ?");
      args.push(body.accountId as string);
    }
    if (body.isHidden !== undefined) {
      sets.push("is_hidden = ?");
      args.push(body.isHidden ? 1 : 0);
    }

    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      args.push(id);
      await db.runAsync(
        `UPDATE transactions SET ${sets.join(", ")} WHERE id = ?`,
        args,
      );
    }

    // Update tags if provided
    if (body.tagIds !== undefined) {
      await db.runAsync("DELETE FROM transaction_tags WHERE transaction_id = ?", [id]);
      const tagIds = body.tagIds as string[];
      for (const tagId of tagIds) {
        await db.runAsync(
          "INSERT OR IGNORE INTO transaction_tags (id, transaction_id, tag_id) VALUES (?, ?, ?)",
          [uuid(), id, tagId],
        );
      }
    }

    return this.getTransactionById(id);
  }

  private async deleteTransaction(id: string) {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM transactions WHERE id = ?", [id]);
  }

  // ── Categories ────────────────────────────────────────────

  private async listCategories() {
    const db = await getDatabase();

    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT c.id, c.name, c.emoji, c.parent_id,
              bc.budget_id as budget_id,
              b.name as budget_name
       FROM categories c
       LEFT JOIN budget_categories bc ON bc.category_id = c.id
       LEFT JOIN budgets b ON bc.budget_id = b.id
       ORDER BY c.name`,
    );

    // Build tree: top-level categories with children
    const byId = new Map<string, Record<string, unknown>>();
    const topLevel: Record<string, unknown>[] = [];

    for (const r of rows) {
      const cat: Record<string, unknown> = {
        id: r.id,
        name: r.name,
        emoji: r.emoji || null,
        parentId: r.parent_id || null,
        children: [],
        budgetCategory: r.budget_id
          ? { budget: { id: r.budget_id, name: r.budget_name } }
          : null,
      };
      byId.set(r.id as string, cat);
    }

    for (const cat of byId.values()) {
      if (cat.parentId) {
        const parent = byId.get(cat.parentId as string);
        if (parent) {
          (parent.children as Record<string, unknown>[]).push(cat);
        } else {
          topLevel.push(cat);
        }
      } else {
        topLevel.push(cat);
      }
    }

    return topLevel;
  }

  private async createCategory(body: Record<string, unknown>) {
    const db = await getDatabase();
    const id = uuid();
    await db.runAsync(
      "INSERT INTO categories (id, name, emoji, parent_id) VALUES (?, ?, ?, ?)",
      [
        id,
        body.name as string,
        (body.emoji as string) || null,
        (body.parentId as string) || null,
      ],
    );
    return {
      id,
      name: body.name,
      emoji: body.emoji || null,
      parentId: body.parentId || null,
      children: [],
      budgetCategory: null,
    };
  }

  private async updateCategory(id: string, body: Record<string, unknown>) {
    const db = await getDatabase();
    const sets: string[] = [];
    const args: (string | number | null)[] = [];

    if (body.name !== undefined) {
      sets.push("name = ?");
      args.push(body.name as string);
    }
    if (body.emoji !== undefined) {
      sets.push("emoji = ?");
      args.push((body.emoji as string) || null);
    }
    if (body.parentId !== undefined) {
      sets.push("parent_id = ?");
      args.push((body.parentId as string) || null);
    }

    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      args.push(id);
      await db.runAsync(
        `UPDATE categories SET ${sets.join(", ")} WHERE id = ?`,
        args,
      );
    }

    const row = await db.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM categories WHERE id = ?",
      [id],
    );
    return {
      id,
      name: row?.name,
      emoji: row?.emoji || null,
      parentId: row?.parent_id || null,
      children: [],
      budgetCategory: null,
    };
  }

  private async deleteCategory(id: string) {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM categories WHERE id = ?", [id]);
  }

  // ── Accounts ──────────────────────────────────────────────

  private async listAccounts() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT a.*, i.id as inst_id, i.name as inst_name
       FROM accounts a
       LEFT JOIN institutions i ON a.institution_id = i.id
       ORDER BY a.name`,
    );
    return rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      type: r.type as string,
      subtype: (r.subtype as string) || null,
      balance: r.balance as number,
      currency: r.currency as string,
      isHidden: !!(r.is_hidden as number),
      isManual: !!(r.is_manual as number),
      institution: r.inst_id
        ? { id: r.inst_id as string, name: r.inst_name as string }
        : undefined,
    }));
  }

  private async createAccount(body: Record<string, unknown>) {
    const db = await getDatabase();
    const id = uuid();

    // If institutionName is provided, find or create institution
    let institutionId = (body.institutionId as string) || null;
    if (!institutionId && body.institutionName) {
      const existing = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM institutions WHERE name = ?",
        [body.institutionName as string],
      );
      if (existing) {
        institutionId = existing.id;
      } else {
        institutionId = uuid();
        await db.runAsync(
          "INSERT INTO institutions (id, name, is_manual) VALUES (?, ?, 1)",
          [institutionId, body.institutionName as string],
        );
      }
    }

    if (!institutionId) {
      // Use first institution as fallback
      const first = await db.getFirstAsync<{ id: string }>("SELECT id FROM institutions LIMIT 1");
      institutionId = first?.id || uuid();
    }

    await db.runAsync(
      `INSERT INTO accounts (id, institution_id, name, type, subtype, balance, currency, is_manual)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        institutionId,
        (body.name as string) || "Account",
        (body.type as string) || "checking",
        (body.subtype as string) || null,
        (body.balance as number) || 0,
        (body.currency as string) || "USD",
      ],
    );

    return this.getAccountById(id);
  }

  private async getAccountById(id: string) {
    const db = await getDatabase();
    const r = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT a.*, i.id as inst_id, i.name as inst_name
       FROM accounts a
       LEFT JOIN institutions i ON a.institution_id = i.id
       WHERE a.id = ?`,
      [id],
    );
    if (!r) throw new Error("Account not found");
    return {
      id: r.id as string,
      name: r.name as string,
      type: r.type as string,
      subtype: (r.subtype as string) || null,
      balance: r.balance as number,
      currency: r.currency as string,
      isHidden: !!(r.is_hidden as number),
      isManual: !!(r.is_manual as number),
      institution: r.inst_id
        ? { id: r.inst_id as string, name: r.inst_name as string }
        : undefined,
    };
  }

  private async deleteAccount(id: string) {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM accounts WHERE id = ?", [id]);
  }

  private async updateAccount(id: string, body: Record<string, unknown>) {
    const db = await getDatabase();
    const sets: string[] = [];
    const args: (string | number | null)[] = [];

    if (body.name !== undefined) {
      sets.push("name = ?");
      args.push(body.name as string);
    }
    if (body.isHidden !== undefined) {
      sets.push("is_hidden = ?");
      args.push(body.isHidden ? 1 : 0);
    }

    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      args.push(id);
      await db.runAsync(
        `UPDATE accounts SET ${sets.join(", ")} WHERE id = ?`,
        args,
      );
    }

    const r = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT a.*, i.id as inst_id, i.name as inst_name
       FROM accounts a
       LEFT JOIN institutions i ON a.institution_id = i.id
       WHERE a.id = ?`,
      [id],
    );
    if (!r) throw new Error("Account not found");
    return {
      id: r.id as string,
      name: r.name as string,
      type: r.type as string,
      subtype: (r.subtype as string) || null,
      balance: r.balance as number,
      currency: r.currency as string,
      isHidden: !!(r.is_hidden as number),
      isManual: !!(r.is_manual as number),
      institution: r.inst_id
        ? { id: r.inst_id as string, name: r.inst_name as string }
        : undefined,
    };
  }

  // ── Institutions ──────────────────────────────────────────

  private async listInstitutions() {
    const db = await getDatabase();
    const instRows = await db.getAllAsync<Record<string, unknown>>(
      "SELECT * FROM institutions ORDER BY name",
    );
    const acctRows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT a.*, i.id as inst_id, i.name as inst_name
       FROM accounts a
       LEFT JOIN institutions i ON a.institution_id = i.id`,
    );

    return instRows.map((inst) => ({
      id: inst.id as string,
      name: inst.name as string,
      isManual: !!(inst.is_manual as number),
      accounts: acctRows
        .filter((a) => a.institution_id === inst.id)
        .map((a) => ({
          id: a.id as string,
          name: a.name as string,
          type: a.type as string,
          subtype: (a.subtype as string) || null,
          balance: a.balance as number,
          currency: a.currency as string,
          isHidden: !!(a.is_hidden as number),
          isManual: !!(a.is_manual as number),
          institution: { id: inst.id as string, name: inst.name as string },
        })),
    }));
  }

  private async createInstitution(body: Record<string, unknown>) {
    const db = await getDatabase();
    const id = uuid();
    await db.runAsync(
      "INSERT INTO institutions (id, name, is_manual) VALUES (?, ?, 1)",
      [id, (body.name as string) || "Institution"],
    );
    return {
      id,
      name: body.name,
      isManual: true,
      accounts: [],
    };
  }

  private async deleteInstitution(id: string) {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM institutions WHERE id = ?", [id]);
  }

  // ── Budgets ───────────────────────────────────────────────

  private async listBudgets() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      "SELECT * FROM budgets ORDER BY name",
    );

    const bcRows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT bc.budget_id, c.id as cat_id, c.name as cat_name
       FROM budget_categories bc
       JOIN categories c ON bc.category_id = c.id`,
    );

    return rows.map((b) => ({
      id: b.id as string,
      name: b.name as string,
      icon: (b.icon as string) || null,
      amount: b.amount as number,
      categories: bcRows
        .filter((bc) => bc.budget_id === b.id)
        .map((bc) => ({
          category: { id: bc.cat_id as string, name: bc.cat_name as string },
        })),
    }));
  }

  private async createBudget(body: Record<string, unknown>) {
    const db = await getDatabase();
    const id = uuid();
    await db.runAsync(
      "INSERT INTO budgets (id, name, icon, amount) VALUES (?, ?, ?, ?)",
      [
        id,
        body.name as string,
        (body.icon as string) || null,
        (body.amount as number) || 0,
      ],
    );

    const categoryIds = body.categoryIds as string[] | undefined;
    if (categoryIds?.length) {
      for (const catId of categoryIds) {
        await db.runAsync(
          "INSERT OR IGNORE INTO budget_categories (id, budget_id, category_id) VALUES (?, ?, ?)",
          [uuid(), id, catId],
        );
      }
    }

    return this.getBudgetById(id);
  }

  private async updateBudget(id: string, body: Record<string, unknown>) {
    const db = await getDatabase();
    const sets: string[] = [];
    const args: (string | number | null)[] = [];

    if (body.name !== undefined) {
      sets.push("name = ?");
      args.push(body.name as string);
    }
    if (body.icon !== undefined) {
      sets.push("icon = ?");
      args.push((body.icon as string) || null);
    }
    if (body.amount !== undefined) {
      sets.push("amount = ?");
      args.push(body.amount as number);
    }

    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      args.push(id);
      await db.runAsync(
        `UPDATE budgets SET ${sets.join(", ")} WHERE id = ?`,
        args,
      );
    }

    // Replace category associations
    if (body.categoryIds !== undefined) {
      await db.runAsync("DELETE FROM budget_categories WHERE budget_id = ?", [
        id,
      ]);
      const categoryIds = body.categoryIds as string[];
      for (const catId of categoryIds) {
        await db.runAsync(
          "INSERT OR IGNORE INTO budget_categories (id, budget_id, category_id) VALUES (?, ?, ?)",
          [uuid(), id, catId],
        );
      }
    }

    return this.getBudgetById(id);
  }

  private async getBudgetById(id: string) {
    const db = await getDatabase();
    const b = await db.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM budgets WHERE id = ?",
      [id],
    );
    if (!b) throw new Error("Budget not found");

    const bcRows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT c.id as cat_id, c.name as cat_name
       FROM budget_categories bc
       JOIN categories c ON bc.category_id = c.id
       WHERE bc.budget_id = ?`,
      [id],
    );

    return {
      id: b.id as string,
      name: b.name as string,
      icon: (b.icon as string) || null,
      amount: b.amount as number,
      categories: bcRows.map((bc) => ({
        category: { id: bc.cat_id as string, name: bc.cat_name as string },
      })),
    };
  }

  private async deleteBudget(id: string) {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM budgets WHERE id = ?", [id]);
  }

  // ── Tags ──────────────────────────────────────────────────

  private async listTags() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      "SELECT * FROM tags ORDER BY name",
    );
    return rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      color: r.color as string,
    }));
  }

  private async createTag(body: Record<string, unknown>) {
    const db = await getDatabase();
    const id = uuid();
    await db.runAsync(
      "INSERT INTO tags (id, name, color) VALUES (?, ?, ?)",
      [id, body.name as string, body.color as string],
    );
    return { id, name: body.name, color: body.color };
  }

  private async updateTag(id: string, body: Record<string, unknown>) {
    const db = await getDatabase();
    const sets: string[] = [];
    const args: (string | number)[] = [];

    if (body.name !== undefined) {
      sets.push("name = ?");
      args.push(body.name as string);
    }
    if (body.color !== undefined) {
      sets.push("color = ?");
      args.push(body.color as string);
    }

    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      args.push(id);
      await db.runAsync(
        `UPDATE tags SET ${sets.join(", ")} WHERE id = ?`,
        args,
      );
    }

    const row = await db.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM tags WHERE id = ?",
      [id],
    );
    return { id, name: row?.name, color: row?.color };
  }

  private async deleteTag(id: string) {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM tags WHERE id = ?", [id]);
  }

  // ── Settings ──────────────────────────────────────────────

  private async getSettings() {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM settings WHERE id = 'default'",
    );
    return {
      theme: (row?.theme as string) || "system",
      language: (row?.language as string) || "en",
      mode: (row?.mode as string) || "casual",
      tabConfig: (row?.tab_config as string) || "overview,transactions,budgets,accounts",
      fireworks: row?.fireworks !== undefined ? !!(row.fireworks as number) : true,
    };
  }

  private async updateSettings(body: Record<string, unknown>) {
    const db = await getDatabase();
    const sets: string[] = [];
    const args: (string | number)[] = [];

    if (body.theme !== undefined) {
      sets.push("theme = ?");
      args.push(body.theme as string);
    }
    if (body.language !== undefined) {
      sets.push("language = ?");
      args.push(body.language as string);
    }
    if (body.mode !== undefined) {
      sets.push("mode = ?");
      args.push(body.mode as string);
    }
    if (body.tabConfig !== undefined) {
      sets.push("tab_config = ?");
      args.push(body.tabConfig as string);
    }
    if (body.fireworks !== undefined) {
      sets.push("fireworks = ?");
      args.push(body.fireworks ? 1 : 0);
    }

    if (sets.length > 0) {
      args.push("default");
      await db.runAsync(
        `UPDATE settings SET ${sets.join(", ")} WHERE id = ?`,
        args,
      );
    }

    return this.getSettings();
  }

  // ── Profile ───────────────────────────────────────────────

  private async getProfile() {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM profile WHERE id = 'default'",
    );
    return {
      id: "local",
      email: (row?.email as string) || "",
      name: (row?.name as string) || null,
      image: null,
      hasCompletedTutorial: true,
      authProvider: "local",
    };
  }

  private async updateProfile(body: Record<string, unknown>) {
    const db = await getDatabase();
    if (body.name !== undefined) {
      await db.runAsync("UPDATE profile SET name = ? WHERE id = 'default'", [
        body.name as string,
      ]);
    }
    if (body.email !== undefined) {
      await db.runAsync("UPDATE profile SET email = ? WHERE id = 'default'", [
        body.email as string,
      ]);
    }
    return this.getProfile();
  }

  // ── Rules ─────────────────────────────────────────────────

  private async listRules() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT r.*, c.name as cat_name
       FROM category_rules r
       LEFT JOIN categories c ON r.category_id = c.id
       ORDER BY r.sequence`,
    );
    return rows.map((r) => ({
      id: r.id as string,
      sequence: r.sequence as number,
      match: r.match as string,
      categoryId: r.category_id as string,
      category: { id: r.category_id as string, name: r.cat_name as string },
    }));
  }

  private async createRule(body: Record<string, unknown>) {
    const db = await getDatabase();
    const id = uuid();

    // Get max sequence
    const maxSeq = await db.getFirstAsync<{ m: number }>(
      "SELECT COALESCE(MAX(sequence), -1) as m FROM category_rules",
    );
    const sequence = (maxSeq?.m ?? -1) + 1;

    await db.runAsync(
      "INSERT INTO category_rules (id, sequence, match, category_id) VALUES (?, ?, ?, ?)",
      [id, sequence, body.match as string, body.categoryId as string],
    );

    return { id, sequence, match: body.match, categoryId: body.categoryId };
  }

  private async updateRule(id: string, body: Record<string, unknown>) {
    const db = await getDatabase();
    const sets: string[] = [];
    const args: (string | number)[] = [];

    if (body.match !== undefined) {
      sets.push("match = ?");
      args.push(body.match as string);
    }
    if (body.categoryId !== undefined) {
      sets.push("category_id = ?");
      args.push(body.categoryId as string);
    }
    if (body.sequence !== undefined) {
      sets.push("sequence = ?");
      args.push(body.sequence as number);
    }

    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      args.push(id);
      await db.runAsync(
        `UPDATE category_rules SET ${sets.join(", ")} WHERE id = ?`,
        args,
      );
    }

    const row = await db.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM category_rules WHERE id = ?",
      [id],
    );
    return {
      id,
      sequence: row?.sequence,
      match: row?.match,
      categoryId: row?.category_id,
    };
  }

  private async deleteRule(id: string) {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM category_rules WHERE id = ?", [id]);
  }
}
