import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [
    institutions,
    accounts,
    categories,
    transactions,
    tags,
    transactionTags,
    budgets,
    budgetCategories,
    rules,
    settings,
  ] = await Promise.all([
    prisma.institution.findMany({ where: { userId } }),
    prisma.account.findMany({ where: { userId } }),
    prisma.category.findMany({ where: { userId } }),
    prisma.transaction.findMany({ where: { userId } }),
    prisma.tag.findMany({ where: { userId } }),
    prisma.transactionTag.findMany({
      where: { transaction: { userId } },
    }),
    prisma.budget.findMany({ where: { userId } }),
    prisma.budgetCategory.findMany({
      where: { budget: { userId } },
    }),
    prisma.categoryRule.findMany({ where: { userId }, orderBy: { sequence: "asc" } }),
    prisma.userSetting.findFirst({ where: { userId } }),
  ]);

  // Build tag lookup per transaction
  const txTagMap: Record<string, string[]> = {};
  for (const tt of transactionTags) {
    if (!txTagMap[tt.transactionId]) txTagMap[tt.transactionId] = [];
    txTagMap[tt.transactionId].push(tt.tagId);
  }

  // Build category lookup per budget
  const budgetCatMap: Record<string, string[]> = {};
  for (const bc of budgetCategories) {
    if (!budgetCatMap[bc.budgetBucketId]) budgetCatMap[bc.budgetBucketId] = [];
    budgetCatMap[bc.budgetBucketId].push(bc.categoryId);
  }

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      institutions: institutions.map((i) => ({
        id: i.id,
        name: i.name,
        isManual: i.isManual,
      })),
      accounts: accounts.map((a) => ({
        id: a.id,
        institutionId: a.institutionId,
        name: a.name,
        type: a.type,
        subtype: a.subtype || null,
        balance: Number(a.balance),
        currency: a.currency,
        isHidden: a.isHidden,
        isManual: a.isManual,
      })),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        emoji: c.emoji || null,
        parentId: c.parentId || null,
      })),
      transactions: transactions.map((t) => ({
        id: t.id,
        accountId: t.accountId,
        categoryId: t.categoryId || null,
        description: t.description,
        amount: Number(t.amount),
        date: t.date.toISOString().split("T")[0],
        isHidden: t.isHidden,
        isManual: t.isManual,
        tagIds: txTagMap[t.id] || [],
      })),
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
      })),
      budgets: budgets.map((b) => ({
        id: b.id,
        name: b.name,
        icon: b.icon || null,
        amount: Number(b.amount),
        categoryIds: budgetCatMap[b.id] || [],
      })),
      categoryRules: rules.map((r) => ({
        id: r.id,
        sequence: r.sequence,
        match: r.match,
        categoryId: r.categoryId,
      })),
      settings: settings
        ? {
            theme: settings.theme,
            language: settings.language || "en",
            mode: settings.mode,
          }
        : { theme: "system", language: "en", mode: "casual" },
    },
  };

  return NextResponse.json(exportData);
}
