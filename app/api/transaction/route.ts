import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { matchRule } from "@/app/lib/rules";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  const categoryId = searchParams.get("categoryId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const search = searchParams.get("search");
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");
  const includeHidden = searchParams.get("includeHidden") === "true";

  const where: Record<string, unknown> = {
    userId: session.user.id,
  };

  if (!includeHidden) {
    where.isHidden = false;
  }

  if (accountId) {
    const ids = accountId.split(",").filter(Boolean);
    where.accountId = ids.length === 1 ? ids[0] : { in: ids };
  }
  if (categoryId) {
    const ids = categoryId.split(",").filter(Boolean);
    if (ids.length === 1) {
      where.categoryId = ids[0] === "uncategorized" ? null : ids[0];
    } else {
      const hasUncategorized = ids.includes("uncategorized");
      const realIds = ids.filter((id) => id !== "uncategorized");
      if (hasUncategorized && realIds.length > 0) {
        where.OR = [{ categoryId: null }, { categoryId: { in: realIds } }];
      } else if (hasUncategorized) {
        where.categoryId = null;
      } else {
        where.categoryId = { in: realIds };
      }
    }
  }
  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate + "T00:00:00.000Z");
    if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate + "T23:59:59.999Z");
  }
  if (search) {
    where.description = { contains: search, mode: "insensitive" };
  }
  if (minAmount || maxAmount) {
    where.amount = {};
    if (minAmount) (where.amount as Record<string, unknown>).gte = parseFloat(minAmount);
    if (maxAmount) (where.amount as Record<string, unknown>).lte = parseFloat(maxAmount);
  }

  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
  const skip = pageSize === 0 ? undefined : (page - 1) * pageSize;
  const take = pageSize === 0 ? undefined : pageSize;

  const sortBy = searchParams.get("sortBy") || "date";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const SORTABLE_FIELDS: Record<string, object> = {
    date: { date: sortOrder },
    description: { description: sortOrder },
    amount: { amount: sortOrder },
    account: { account: { name: sortOrder } },
  };
  const orderBy = [
    SORTABLE_FIELDS[sortBy] || { date: sortOrder },
    { createdAt: sortOrder },
  ];

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        account: { select: { id: true, name: true, institution: { select: { name: true } } } },
        category: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } },
        transactionTags: { include: { tag: { select: { id: true, name: true, color: true } } } },
      },
      orderBy,
      skip,
      take,
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({ transactions, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { accountId, description, amount, date, categoryId } = body;

  if (!accountId || !description || amount === undefined || !date) {
    return NextResponse.json(
      { error: "accountId, description, amount, and date are required" },
      { status: 400 }
    );
  }

  // Verify the account belongs to this user
  const account = await prisma.account.findUnique({
    where: { id: accountId, userId: session.user.id },
  });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId, userId: session.user.id },
    });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
  }

  // Apply category rules if no category specified
  let resolvedCategoryId = categoryId || null;
  if (!resolvedCategoryId) {
    resolvedCategoryId = await matchRule(session.user.id, description);
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId: session.user.id,
      accountId,
      description,
      amount,
      date: new Date(date),
      categoryId: resolvedCategoryId,
      isManual: true,
    },
    include: {
      account: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(transaction, { status: 201 });
}
