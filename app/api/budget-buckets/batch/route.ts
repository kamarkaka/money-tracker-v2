import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

interface BucketInput {
    name: string;
    amount: number;
    categoryIds: string[];
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { buckets } = body as { buckets: BucketInput[] };

    if (!buckets || !Array.isArray(buckets) || buckets.length === 0) {
        return NextResponse.json({ error: "Buckets array is required" }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
        // Collect all categoryIds to check for conflicts
        const allCategoryIds = buckets.flatMap((b) => b.categoryIds || []);
        if (allCategoryIds.length > 0) {
            const existing = await tx.budgetCategory.findMany({
                where: { categoryId: { in: allCategoryIds } },
            });
            if (existing.length > 0) {
                throw new Error("One or more categories already assigned to another budget");
            }
        }

        const results = [];
        for (const bucket of buckets) {
            if (!bucket.name?.trim()) continue;
            if (!bucket.amount || bucket.amount <= 0) continue;

            const budget = await tx.budget.create({
                data: {
                    name: bucket.name.trim(),
                    amount: bucket.amount,
                    userId: session.user!.id!,
                    categories: bucket.categoryIds?.length
                        ? { create: bucket.categoryIds.map((categoryId) => ({ categoryId }))}
                        : undefined,
                },
                include: {
                    categories: {
                        include: { category: { select: { id: true, name: true } } },
                    },
                },
            });
            results.push(budget);
        }

        return results;
    });

    return NextResponse.json({ created: created.length, budgets: created }, { status: 201 });
};
