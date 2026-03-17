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
  const body = await request.json();
  const { name, parentId } = body;

  const existing = await prisma.category.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  // If changing parentId, validate depth
  if (parentId !== undefined) {
    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId, userId: session.user.id },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent category not found" }, { status: 404 });
      }
      if (parent.parentId) {
        return NextResponse.json(
          { error: "Cannot nest more than two levels deep" },
          { status: 400 }
        );
      }
      // Cannot set a parent category as a child if it has children
      const childCount = await prisma.category.count({
        where: { parentId: id },
      });
      if (childCount > 0) {
        return NextResponse.json(
          { error: "Cannot make a parent category into a sub-category while it has children" },
          { status: 400 }
        );
      }
    }
  }

  // Check for duplicate name under the target parent
  const newName = name !== undefined ? name.trim() : existing.name;
  const newParentId = parentId !== undefined ? (parentId || null) : existing.parentId;
  if (newName !== existing.name || newParentId !== existing.parentId) {
    const duplicate = await prisma.category.findFirst({
      where: {
        userId: session.user.id,
        name: newName,
        parentId: newParentId,
        id: { not: id },
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      );
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(parentId !== undefined && { parentId: parentId || null }),
    },
  });

  return NextResponse.json(category);
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

  const existing = await prisma.category.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
