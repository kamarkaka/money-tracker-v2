import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { verifyMobileToken, signMobileToken } from "@/app/lib/mobile-jwt";
import { rateLimit } from "@/app/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { maxRequests: 20, windowMs: 60_000, prefix: "mobile-refresh" });
  if (limited) return limited;

  const body = await request.json();
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const payload = await verifyMobileToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // Verify user still exists
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, image: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const newToken = await signMobileToken({ userId: user.id, email: user.email });

  return NextResponse.json({
    token: newToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
  });
}
