import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, categoryIds, amount, icon } = body as { name?: string; categoryIds?: string[]; amount?: number; icon?: string };

  const existing = await prisma.budget.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 });
  }

  // If categoryIds are provided, verify ownership and check for conflicts
  if (categoryIds) {
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

    const conflicts = await prisma.budgetCategory.findMany({
      where: {
        categoryId: { in: categoryIds },
        budgetBucketId: { not: id },
      },
    });
    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: "One or more categories are already assigned to another budget" },
        { status: 400 }
      );
    }

    // Replace all category mappings atomically
    await prisma.$transaction([
      prisma.budgetCategory.deleteMany({ where: { budgetBucketId: id } }),
      prisma.budgetCategory.createMany({
        data: categoryIds.map((categoryId: string) => ({
          budgetBucketId: id,
          categoryId,
        })),
      }),
    ]);
  }

  const budget = await prisma.budget.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(amount !== undefined && { amount }),
      ...(icon !== undefined && { icon: icon || null }),
    },
    include: {
      categories: {
        include: { category: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json(budget);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.budget.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 });
  }

  await prisma.budget.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
