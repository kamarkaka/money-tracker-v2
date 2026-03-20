import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { randomTagColor } from "@/app/lib/tag-colors";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tags = await prisma.tag.findMany({
    where: { userId: session.user.id },
    include: {
      transactionTags: {
        include: {
          transaction: { select: { amount: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const result = tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    transactionCount: tag.transactionTags.length,
    totalAmount: tag.transactionTags.reduce(
      (sum, tt) => sum + Number(tt.transaction.amount),
      0
    ),
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, color } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
  }

  // Check for duplicate name
  const duplicate = await prisma.tag.findFirst({
    where: {
      userId: session.user.id,
      name: { equals: name.trim(), mode: "insensitive" },
    },
  });
  if (duplicate) {
    return NextResponse.json({ error: "A tag with this name already exists" }, { status: 409 });
  }

  const tag = await prisma.tag.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      color: color || randomTagColor(),
    },
  });

  return NextResponse.json(tag, { status: 201 });
}
