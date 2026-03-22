import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { EMOJI_TO_NAME } from "@/app/lib/emoji-categories";

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
  const { categoryId, isHidden, description, amount, date, accountId, tagIds, emoji } = body;

  const existing = await prisma.transaction.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  // Resolve emoji to category
  let resolvedCategoryId = categoryId;
  if (emoji && !categoryId) {
    let emojiCategory = await prisma.category.findFirst({
      where: { userId: session.user.id, emoji },
    });
    if (!emojiCategory) {
      const name = EMOJI_TO_NAME[emoji] || emoji;
      emojiCategory = await prisma.category.create({
        data: { userId: session.user.id, name, emoji },
      });
    }
    resolvedCategoryId = emojiCategory.id;
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
  if (resolvedCategoryId !== undefined) data.categoryId = resolvedCategoryId || null;
  else if (categoryId !== undefined) data.categoryId = categoryId || null;
  if (isHidden !== undefined) data.isHidden = isHidden;
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

  // Handle tag updates
  if (tagIds !== undefined && Array.isArray(tagIds)) {
    // Verify all tags belong to this user
    if (tagIds.length > 0) {
      const ownedTags = await prisma.tag.findMany({
        where: { id: { in: tagIds }, userId: session.user.id },
        select: { id: true },
      });
      if (ownedTags.length !== tagIds.length) {
        return NextResponse.json({ error: "Tag not found" }, { status: 404 });
      }
    }

    await prisma.$transaction([
      prisma.transactionTag.deleteMany({ where: { transactionId: id } }),
      ...(tagIds.length > 0
        ? [prisma.transactionTag.createMany({
            data: tagIds.map((tagId: string) => ({ transactionId: id, tagId })),
          })]
        : []),
    ]);
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data,
    include: {
      category: { select: { id: true, name: true } },
      transactionTags: { include: { tag: { select: { id: true, name: true, color: true } } } },
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
