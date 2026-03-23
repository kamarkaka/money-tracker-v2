import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { SophtronClientV2 } from "@/app/lib/sophtron";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const institution = await prisma.institution.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!institution) {
    return NextResponse.json({ error: "Institution not found" }, { status: 404 });
  }
  if (!institution.sophtronMemberId) {
    return NextResponse.json({ error: "Manual institutions cannot be refreshed" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { sophtronCustomerId: true },
  });
  if (!user?.sophtronCustomerId) {
    return NextResponse.json({ error: "Sophtron customer not set up" }, { status: 400 });
  }

  try {
    const client = new SophtronClientV2();
    const result = await client.refreshMember(
      user.sophtronCustomerId,
      institution.sophtronMemberId,
      "aggregate",
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = result as any;
    const jobId = raw.JobID || raw.JobId;
    const memberId = raw.MemberID || raw.MemberId || institution.sophtronMemberId;

    return NextResponse.json({ jobId, memberId, institutionName: institution.name });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
