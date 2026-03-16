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
  const { name, sophtronMemberId, accountName, accountType, balance, currency } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Manual account creation: no sophtronMemberId, create institution + account together
  if (!sophtronMemberId) {
    if (!accountName || !accountType) {
      return NextResponse.json(
        { error: "Account name and type are required for manual accounts" },
        { status: 400 }
      );
    }

    const institution = await prisma.institution.create({
      data: {
        name,
        isManual: true,
        userId: session.user.id,
        accounts: {
          create: {
            name: accountName,
            type: accountType,
            balance: balance ?? 0,
            currency: currency || "USD",
            isManual: true,
            userId: session.user.id,
          },
        },
      },
      include: { accounts: true },
    });

    return NextResponse.json(institution, { status: 201 });
  }

  // Sophtron-linked institution
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
