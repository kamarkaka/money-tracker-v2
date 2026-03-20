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

  const existing = await prisma.categoryRule.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  const body = await request.json();
  const { match, categoryId } = body;

  const data: Record<string, unknown> = {};

  if (match !== undefined) {
    if (!match.trim()) {
      return NextResponse.json({ error: "Match string is required" }, { status: 400 });
    }
    data.match = match.trim();
  }

  if (categoryId !== undefined) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId, userId: session.user.id },
    });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    data.categoryId = categoryId;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(existing);
  }

  const rule = await prisma.categoryRule.update({
    where: { id },
    data,
    include: {
      category: {
        select: { id: true, name: true, parentId: true, parent: { select: { name: true } } },
      },
    },
  });

  return NextResponse.json(rule);
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

  const existing = await prisma.categoryRule.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  await prisma.categoryRule.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
