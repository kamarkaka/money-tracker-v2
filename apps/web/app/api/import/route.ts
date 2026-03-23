import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

interface ImportData {
  version: number;
  data: {
    institutions: { id: string; name: string; isManual: boolean }[];
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
    tags: { id: string; name: string; color: string }[];
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
    settings?: { theme: string; language: string; mode: string };
  };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = (await request.json()) as ImportData;

  if (!body.version || !body.data) {
    return NextResponse.json(
      { error: "Invalid export format" },
      { status: 400 },
    );
  }

  const d = body.data;

  try {
    await prisma.$transaction(async (tx) => {
      // Clear existing data (order matters for foreign keys)
      await tx.transactionTag.deleteMany({
        where: { transaction: { userId } },
      });
      await tx.transaction.deleteMany({ where: { userId } });
      await tx.budgetCategory.deleteMany({
        where: { budget: { userId } },
      });
      await tx.budget.deleteMany({ where: { userId } });
      await tx.categoryRule.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      await tx.institution.deleteMany({ where: { userId } });
      await tx.category.deleteMany({ where: { userId } });
      await tx.tag.deleteMany({ where: { userId } });

      // Import institutions
      for (const inst of d.institutions) {
        await tx.institution.create({
          data: {
            id: inst.id,
            userId,
            name: inst.name,
            isManual: inst.isManual,
          },
        });
      }

      // Import accounts
      for (const acct of d.accounts) {
        await tx.account.create({
          data: {
            id: acct.id,
            userId,
            institutionId: acct.institutionId,
            name: acct.name,
            type: acct.type,
            subtype: acct.subtype,
            balance: acct.balance,
            currency: acct.currency,
            isHidden: acct.isHidden,
            isManual: acct.isManual,
          },
        });
      }

      // Import categories (parents first)
      const parentCats = d.categories.filter((c) => !c.parentId);
      const childCats = d.categories.filter((c) => c.parentId);
      for (const cat of [...parentCats, ...childCats]) {
        await tx.category.create({
          data: {
            id: cat.id,
            userId,
            name: cat.name,
            emoji: cat.emoji,
            parentId: cat.parentId,
          },
        });
      }

      // Import tags
      for (const tag of d.tags) {
        await tx.tag.create({
          data: {
            id: tag.id,
            userId,
            name: tag.name,
            color: tag.color,
          },
        });
      }

      // Import transactions
      for (const txn of d.transactions) {
        await tx.transaction.create({
          data: {
            id: txn.id,
            userId,
            accountId: txn.accountId,
            categoryId: txn.categoryId,
            description: txn.description,
            amount: txn.amount,
            date: new Date(txn.date),
            isHidden: txn.isHidden,
            isManual: txn.isManual,
          },
        });

        // Import transaction tags
        for (const tagId of txn.tagIds || []) {
          await tx.transactionTag.create({
            data: {
              transactionId: txn.id,
              tagId,
            },
          });
        }
      }

      // Import budgets
      for (const budget of d.budgets) {
        await tx.budget.create({
          data: {
            id: budget.id,
            userId,
            name: budget.name,
            icon: budget.icon,
            amount: budget.amount,
          },
        });
        for (const catId of budget.categoryIds || []) {
          await tx.budgetCategory.create({
            data: {
              budgetBucketId: budget.id,
              categoryId: catId,
            },
          });
        }
      }

      // Import rules
      for (const rule of d.categoryRules || []) {
        await tx.categoryRule.create({
          data: {
            id: rule.id,
            userId,
            sequence: rule.sequence,
            match: rule.match,
            categoryId: rule.categoryId,
          },
        });
      }

      // Import settings
      if (d.settings) {
        await tx.userSetting.upsert({
          where: { userId },
          create: {
            userId,
            theme: d.settings.theme,
            language: d.settings.language,
            mode: d.settings.mode,
          },
          update: {
            theme: d.settings.theme,
            language: d.settings.language,
            mode: d.settings.mode,
          },
        });
      }
    });

    return NextResponse.json(
      {
        imported: {
          transactions: d.transactions.length,
          categories: d.categories.length,
          accounts: d.accounts.length,
          tags: d.tags.length,
          budgets: d.budgets.length,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Import failed:", error);
    return NextResponse.json(
      {
        error:
          "Import failed: " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 },
    );
  }
}
