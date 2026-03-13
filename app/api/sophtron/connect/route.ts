import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { SophtronClientV2 } from "@/app/lib/sophtron";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { institutionId, credentials } = await request.json();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { sophtronCustomerId: true },
    });

    if (!user?.sophtronCustomerId) {
      return NextResponse.json({ error: "Sophtron customer not set up" }, { status: 400 });
    }

    const client = new SophtronClientV2();
    const result = await client.createMember(
      user.sophtronCustomerId,
      "aggregate",
      { InstitutionId: institutionId, ...credentials },
    );

    const jobId = (result as any).JobID || (result as any).JobId || result.MemberId;
    const memberId = (result as any).MemberID || result.MemberId;

    return NextResponse.json({ jobId, memberId, raw: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  try {
    const client = new SophtronClientV2();
    const job = await client.getJob(jobId);
    return NextResponse.json(job);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const body = await request.json();
    const { challengeType, ...answer } = body;

    const client = new SophtronClientV2();
    const result = await client.answerJobChallenge(jobId, challengeType, answer);
    return NextResponse.json(result ?? { success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
