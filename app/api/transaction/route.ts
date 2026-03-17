import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

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
    account: { isHidden: false },
  };

  if (!includeHidden) {
    where.isHidden = false;
  }

  if (accountId) where.accountId = accountId;
  if (categoryId) where.categoryId = categoryId === "uncategorized" ? null : categoryId;
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

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
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

  const transaction = await prisma.transaction.create({
    data: {
      userId: session.user.id,
      accountId,
      description,
      amount,
      date: new Date(date),
      categoryId: categoryId || null,
      isManual: true,
    },
    include: {
      account: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(transaction, { status: 201 });
}
