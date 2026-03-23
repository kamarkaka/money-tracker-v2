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

  const existing = await prisma.account.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, isHidden, balance } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) {
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    data.name = name.trim();
  }
  if (isHidden !== undefined) {
    data.isHidden = isHidden;
    // Mark all transactions for this account as hidden/unhidden
    await prisma.transaction.updateMany({
      where: { accountId: id },
      data: { isHidden },
    });
  }
  if (balance !== undefined && existing.isManual) {
    data.balance = balance;
  }

  const updated = await prisma.account.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}
