import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { verifyMobileToken } from "@/app/lib/mobile-jwt";

/**
 * Extended auth that checks both NextAuth session and mobile Bearer token.
 * Returns a session-like object with user.id for API route compatibility.
 */
export async function authWithMobile() {
  // First try NextAuth session (web flow)
  const session = await auth();
  if (session?.user?.id) {
    return session;
  }

  // Fall back to mobile Bearer token
  const headerStore = await headers();
  const authorization = headerStore.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7);
  const payload = await verifyMobileToken(token);
  if (!payload) {
    return null;
  }

  // Return a session-like shape so API routes work unchanged
  return {
    user: {
      id: payload.userId,
      email: payload.email,
    },
  };
}
