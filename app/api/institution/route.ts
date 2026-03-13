import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const institutions = await prisma.institution.findMany({
    where: { userId: session.user.id },
    include: {
      accounts: { where: { isHidden: false }, orderBy: { name: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(institutions);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, sophtronMemberId } = body;

  if (!name || !sophtronMemberId) {
    return NextResponse.json(
      { error: "Name and Sophtron member ID are required" },
      { status: 400 }
    );
  }

  const institution = await prisma.institution.create({
    data: {
      name,
      sophtronMemberId,
      userId: session.user.id,
    },
    include: { accounts: true },
  });

  return NextResponse.json(institution, { status: 201 });
}
