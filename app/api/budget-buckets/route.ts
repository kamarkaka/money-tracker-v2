import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const budgets = await prisma.budget.findMany({
    where: { userId: session.user.id },
    include: {
      categories: {
        include: {
          category: { select: { id: true, name: true, parentId: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(budgets);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, categoryIds, amount } = body as { name: string; categoryIds?: string[]; amount?: number };

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Verify categoryIds belong to this user and are not already assigned
  if (categoryIds && categoryIds.length > 0) {
    const ownedCategories = await prisma.category.findMany({
      where: { id: { in: categoryIds }, userId: session.user.id },
      select: { id: true },
    });
    if (ownedCategories.length !== categoryIds.length) {
      return NextResponse.json(
        { error: "One or more categories not found" },
        { status: 404 }
      );
    }

    const existing = await prisma.budgetCategory.findMany({
      where: { categoryId: { in: categoryIds } },
    });
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "One or more categories are already assigned to another budget" },
        { status: 400 }
      );
    }
  }

  const budget = await prisma.budget.create({
    data: {
      name,
      amount: amount ?? 0,
      userId: session.user.id,
      categories: categoryIds
        ? {
            create: categoryIds.map((categoryId: string) => ({ categoryId })),
          }
        : undefined,
    },
    include: {
      categories: {
        include: { category: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json(budget, { status: 201 });
}
