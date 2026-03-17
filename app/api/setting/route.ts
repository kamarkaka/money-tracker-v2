import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const setting = await prisma.userSetting.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(setting || { theme: "system" });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { theme } = body;

  if (!theme || !["light", "dark", "system"].includes(theme)) {
    return NextResponse.json({ error: "Invalid theme. Must be light, dark, or system" }, { status: 400 });
  }

  const setting = await prisma.userSetting.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, theme: theme },
    update: { theme: theme },
  });

  return NextResponse.json(setting);
}
