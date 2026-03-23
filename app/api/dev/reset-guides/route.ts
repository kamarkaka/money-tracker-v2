import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { GUIDE_PAGES } from "@/app/lib/guide-pages";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  await prisma.pageGuideCompletion.deleteMany({ where: { userId } });
  await prisma.pageGuideCompletion.createMany({
    data: GUIDE_PAGES.map((page) => ({ userId, page })),
  });

  return NextResponse.json({ success: true });
}
