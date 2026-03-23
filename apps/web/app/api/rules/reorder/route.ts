import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ruleIds } = body as { ruleIds: string[] };

  if (!ruleIds || !Array.isArray(ruleIds) || ruleIds.length === 0) {
    return NextResponse.json({ error: "ruleIds array is required" }, { status: 400 });
  }

  // Verify all rules belong to this user
  const rules = await prisma.categoryRule.findMany({
    where: { userId: session.user.id },
    select: { id: true },
  });
  const ownedIds = new Set(rules.map((r) => r.id));
  for (const id of ruleIds) {
    if (!ownedIds.has(id)) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }
  }

  // Batch update sequences
  await prisma.$transaction(
    ruleIds.map((id, index) =>
      prisma.categoryRule.update({
        where: { id },
        data: { sequence: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}
