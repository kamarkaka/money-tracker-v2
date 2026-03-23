import { NextRequest } from "next/server";
import { handlers } from "@/app/lib/auth";
import { rateLimit } from "@/app/lib/rate-limit";

export const { GET } = handlers;

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { maxRequests: 10, windowMs: 60_000, prefix: "auth" });
  if (limited) return limited;

  return handlers.POST(request);
}
