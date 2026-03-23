import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { SophtronClientV2 } from "@/app/lib/sophtron";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query || query.trim().length < 2) {
    return NextResponse.json([]);
  }

  try {
    const client = new SophtronClientV2();
    const results = await client.searchInstitutions(query.trim());
    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
