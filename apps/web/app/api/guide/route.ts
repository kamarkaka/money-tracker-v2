import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

// GET — check if guide should show (record exists = show)
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page");

  if (!page) {
    return NextResponse.json({ error: "page is required" }, { status: 400 });
  }

  const record = await prisma.pageGuideCompletion.findFirst({
    where: { userId: session.user.id, page },
  });

  return NextResponse.json({ shouldShow: !!record });
}

// DELETE — mark guide as completed (remove record)
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { page } = body as { page: string };

  if (!page) {
    return NextResponse.json({ error: "page is required" }, { status: 400 });
  }

  await prisma.pageGuideCompletion.deleteMany({
    where: { userId: session.user.id, page },
  });

  return NextResponse.json({ success: true });
}
