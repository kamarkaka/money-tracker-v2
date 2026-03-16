import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { hashSync, compareSync } from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json(user);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, email, currentPassword, newPassword } = body;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (name !== undefined) {
    data.name = name.trim() || null;
  }

  if (email !== undefined) {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (trimmedEmail !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
      if (existing) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
      data.email = trimmedEmail;
    }
  }

  if (newPassword) {
    if (!user.passwordHash) {
      return NextResponse.json({ error: "Password change is not available for Google sign-in accounts" }, { status: 400 });
    }
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }
    if (!compareSync(currentPassword, user.passwordHash)) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    }
    data.passwordHash = hashSync(newPassword, 10);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json(updated);
}
