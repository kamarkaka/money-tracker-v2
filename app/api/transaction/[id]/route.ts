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
  const { categoryId, isHidden } = body;

  const existing = await prisma.transaction.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (categoryId !== undefined) data.categoryId = categoryId || null;
  if (isHidden !== undefined) data.isHidden = isHidden;

  const transaction = await prisma.transaction.update({
    where: { id },
    data,
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(transaction);
}
