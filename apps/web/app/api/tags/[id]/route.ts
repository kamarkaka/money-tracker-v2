import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.tag.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, color } = body;

  const data: Record<string, string> = {};

  if (name !== undefined) {
    if (!name.trim()) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }
    if (name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await prisma.tag.findFirst({
        where: {
          userId: session.user.id,
          name: { equals: name.trim(), mode: "insensitive" },
          id: { not: id },
        },
      });
      if (duplicate) {
        return NextResponse.json({ error: "A tag with this name already exists" }, { status: 409 });
      }
    }
    data.name = name.trim();
  }

  if (color !== undefined) {
    data.color = color;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(existing);
  }

  const tag = await prisma.tag.update({
    where: { id },
    data,
  });

  return NextResponse.json(tag);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.tag.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  await prisma.tag.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
