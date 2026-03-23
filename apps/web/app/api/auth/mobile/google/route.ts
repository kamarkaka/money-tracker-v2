import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { signMobileToken } from "@/app/lib/mobile-jwt";
import { ensureSophtronCustomer } from "@/app/lib/sophtron/create-customer";
import { rateLimit } from "@/app/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { maxRequests: 10, windowMs: 60_000, prefix: "mobile-google" });
  if (limited) return limited;

  const body = await request.json();
  const { idToken } = body;

  if (!idToken) {
    return NextResponse.json({ error: "idToken is required" }, { status: 400 });
  }

  // Verify Google ID token
  const googlePayload = await verifyGoogleToken(idToken);
  if (!googlePayload) {
    return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
  }

  const { sub: googleId, email, name, picture } = googlePayload;

  // Find or create user
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { googleId },
        { email },
      ],
    },
  });

  if (user) {
    if (!user.googleId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { googleId, image: picture },
      });
    }
    if (!user.sophtronCustomerId) {
      ensureSophtronCustomer(user.id);
    }
  } else {
    user = await prisma.user.create({
      data: {
        email: email!,
        name,
        image: picture,
        googleId,
        authProvider: "google",
      },
    });
    ensureSophtronCustomer(user.id);
  }

  const token = await signMobileToken({ userId: user.id, email: user.email });

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
  });
}

interface GoogleTokenPayload {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload | null> {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) return null;
    const data = await res.json();

    // Verify audience matches our client ID
    const clientId = process.env.AUTH_GOOGLE_ID;
    if (clientId && data.aud !== clientId) return null;

    return {
      sub: data.sub,
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  } catch {
    return null;
  }
}
