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
  const { categoryId, isHidden, description, amount, date, accountId } = body;

  const existing = await prisma.transaction.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  if (categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId, userId: session.user.id },
    });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
  }

  const data: Record<string, unknown> = {};
  if (categoryId !== undefined) data.categoryId = categoryId || null;
  if (isHidden !== undefined) data.isHidden = isHidden;

  // Only allow full editing for manual transactions
  if (existing.isManual) {
    if (description !== undefined) data.description = description;
    if (amount !== undefined) data.amount = amount;
    if (date !== undefined) data.date = new Date(date);
    if (accountId !== undefined) {
      const account = await prisma.account.findUnique({
        where: { id: accountId, userId: session.user.id },
      });
      if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }
      data.accountId = accountId;
    }
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data,
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(transaction);
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

  const existing = await prisma.transaction.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }
  if (!existing.isManual) {
    return NextResponse.json({ error: "Only manual transactions can be deleted" }, { status: 400 });
  }

  await prisma.transaction.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
