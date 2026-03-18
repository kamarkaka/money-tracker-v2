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

  return NextResponse.json(setting || { theme: "system", language: "en" });
}

const VALID_THEMES = ["light", "dark", "system"];
const VALID_LANGUAGES = ["en", "zh", "es", "fr"];

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { theme, language } = body;

  const data: Record<string, string> = {};

  if (theme !== undefined) {
    if (!VALID_THEMES.includes(theme)) {
      return NextResponse.json({ error: "Invalid theme. Must be light, dark, or system" }, { status: 400 });
    }
    data.theme = theme;
  }

  if (language !== undefined) {
    if (!VALID_LANGUAGES.includes(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }
    data.language = language;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const setting = await prisma.userSetting.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });

  return NextResponse.json(setting);
}
