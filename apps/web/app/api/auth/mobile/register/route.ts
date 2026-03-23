import { NextRequest, NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { prisma } from "@/app/lib/db";
import { signMobileToken } from "@/app/lib/mobile-jwt";
import { ensureSophtronCustomer } from "@/app/lib/sophtron/create-customer";
import { rateLimit } from "@/app/lib/rate-limit";
import { GUIDE_PAGES } from "@/app/lib/guide-pages";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { maxRequests: 5, windowMs: 60_000, prefix: "mobile-register" });
  if (limited) return limited;

  const body = await request.json();
  const { email, password, name } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = hashSync(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name: name || null },
  });

  ensureSophtronCustomer(user.id);

  await prisma.pageGuideCompletion.createMany({
    data: GUIDE_PAGES.map((page) => ({ userId: user.id, page })),
  });

  const token = await signMobileToken({ userId: user.id, email: user.email });

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
  }, { status: 201 });
}
