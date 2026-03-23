import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const tag = await prisma.tag.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  const transactionTags = await prisma.transactionTag.findMany({
    where: { tagId: id },
    include: {
      transaction: {
        include: {
          account: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { transaction: { date: "desc" } },
  });

  const transactions = transactionTags.map((tt) => tt.transaction);

  return NextResponse.json(transactions);
}
