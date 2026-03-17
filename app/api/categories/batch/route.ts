import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

interface CategoryInput {
    name: string;
    children?: string[];
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { categories } = body as { categories: CategoryInput[] };

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
        return NextResponse.json({ error: "Categories array is required" }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
        const results = [];

        for (const cat of categories) {
            if (!cat.name?.trim()) continue;

            // Skip if a top-level category with this name already exists
            const existingParent = await tx.category.findFirst({
                where: { userId: session.user!.id!, name: cat.name.trim(), parentId: null },
            });
            if (existingParent) continue;

            const parent = await tx.category.create({
                data: {
                    name: cat.name.trim(),
                    userId: session.user!.id!,
                },
            });
            results.push(parent);

            if (cat.children && Array.isArray(cat.children)) {
                for (const childName of cat.children) {
                    if (!childName?.trim()) continue;

                    // Skip if a child with this name already exists under this parent
                    const existingChild = await tx.category.findFirst({
                        where: { userId: session.user!.id!, name: childName.trim(), parentId: parent.id },
                    });
                    if (existingChild) continue;

                    const child = await tx.category.create({
                        data: {
                            name: childName.trim(),
                            parentId: parent.id,
                            userId: session.user!.id!,
                        },
                    });
                    results.push(child);
                }
            }
        }

        return results;
    });

    return NextResponse.json({ created: created.length, categories: created }, { status: 201 });
};
