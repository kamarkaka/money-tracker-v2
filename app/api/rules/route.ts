import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rules = await prisma.categoryRule.findMany({
    where: { userId: session.user.id },
    include: {
      category: {
        select: { id: true, name: true, parentId: true, parent: { select: { name: true } } },
      },
    },
    orderBy: { sequence: "asc" },
  });

  return NextResponse.json(rules);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { match, categoryId } = body;

  if (!match || !match.trim()) {
    return NextResponse.json({ error: "Match string is required" }, { status: 400 });
  }

  if (!categoryId) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId, userId: session.user.id },
  });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  // Check for duplicate match string (case-insensitive)
  const duplicate = await prisma.categoryRule.findFirst({
    where: {
      userId: session.user.id,
      match: { equals: match.trim(), mode: "insensitive" },
    },
  });
  if (duplicate) {
    return NextResponse.json({ error: "A rule with this match string already exists" }, { status: 409 });
  }

  // Auto-assign next sequence number
  const maxRule = await prisma.categoryRule.findFirst({
    where: { userId: session.user.id },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });
  const nextSequence = (maxRule?.sequence ?? -1) + 1;

  const rule = await prisma.categoryRule.create({
    data: {
      userId: session.user.id,
      match: match.trim(),
      categoryId,
      sequence: nextSequence,
    },
    include: {
      category: {
        select: { id: true, name: true, parentId: true, parent: { select: { name: true } } },
      },
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
