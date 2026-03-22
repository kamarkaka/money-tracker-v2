import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Create dummy institution + account if not exists
  const existingInst = await prisma.institution.findFirst({
    where: { userId, name: "My Wallet", isManual: true },
  });

  if (!existingInst) {
    const institution = await prisma.institution.create({
      data: {
        userId,
        name: "My Wallet",
        isManual: true,
      },
    });

    await prisma.account.create({
      data: {
        userId,
        institutionId: institution.id,
        name: "Daily Expenses",
        type: "checking",
        balance: 0,
        currency: "USD",
        isManual: true,
      },
    });
  }

  // Set mode
  await prisma.userSetting.upsert({
    where: { userId },
    create: { userId, mode: "casual" },
    update: { mode: "casual" },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
