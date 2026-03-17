import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    include: {
      children: { orderBy: { name: "asc" } },
      budgetCategory: { include: { budget: { select: { id: true, name: true } } } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, parentId } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // If parentId is provided, verify it's a top-level category (no parent of its own)
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
  }

  // Check for duplicate name under the same parent
  const duplicate = await prisma.category.findFirst({
    where: {
      userId: session.user.id,
      name: name.trim(),
      parentId: parentId || null,
    },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: "A category with this name already exists" },
      { status: 409 }
    );
  }

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      parentId: parentId || null,
      userId: session.user.id,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
