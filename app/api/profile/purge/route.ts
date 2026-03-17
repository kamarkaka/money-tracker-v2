import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  await prisma.$transaction(async (tx) => {
    await tx.transaction.deleteMany({ where: { userId } });
    await tx.budgetCategory.deleteMany({
      where: { budget: { userId } },
    });
    await tx.budget.deleteMany({ where: { userId } });
    await tx.category.deleteMany({ where: { userId, parentId: { not: null } } });
    await tx.category.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.institution.deleteMany({ where: { userId } });
    await tx.userSetting.deleteMany({ where: { userId } });

    await tx.user.update({
      where: { id: userId },
      data: {
        hasCompletedTutorial: false,
        sophtronCustomerId: null,
      },
    });
  });

  return NextResponse.json({ success: true });
}
