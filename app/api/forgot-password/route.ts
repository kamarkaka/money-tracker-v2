import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/app/lib/db";
import { sendPasswordResetEmail } from "@/app/lib/email";
import { rateLimit } from "@/app/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { maxRequests: 3, windowMs: 60_000, prefix: "forgot-pw" });
  if (limited) return limited;

  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user && user.passwordHash) {
    try {
      // Delete any existing tokens for this email
      await prisma.passwordResetToken.deleteMany({ where: { email } });

      // Generate token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

      // Store hashed token with 1-hour expiry
      await prisma.passwordResetToken.create({
        data: {
          email,
          token: hashedToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // Send email with raw token
      const origin = request.headers.get("origin") || process.env.APP_URL || "http://localhost:3000";
      const resetUrl = `${origin}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail(email, resetUrl);
    } catch {
      // Swallow errors to prevent email enumeration
    }
  }

  // Always return success to prevent email enumeration
  return NextResponse.json({ success: true });
}
