import { randomUUID } from "crypto";
import { prisma } from "@/app/lib/db";
import { SophtronClientV2 } from "@/app/lib/sophtron/client";

/**
 * Creates a Sophtron customer for a user and saves the customer ID.
 * No-ops if the user already has a Sophtron customer ID.
 * Runs in teh background - errors are loged but don't propagate.
 */
export async function ensureSophtronCustomer(userId: string): Promise<void> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { sophtronCustomerId: true, name: true, email: true },
        });

        if (!user || user.sophtronCustomerId) return;

        const client = new SophtronClientV2();
        const customer = await client.createCustomer({
            UniqueId: randomUUID(),
            FirstName: user.name || "User",
            LastName: userId,
            Email: user.email || "",
        });

        const customerId = customer.CustomerID || customer.Id;

        await prisma.user.update({
            where: { id: userId},
            data: { sophtronCustomerId: customerId},
        });
    } catch (err) {
        console.error(
            `[sophtron] Failed to create customer for user ${userId}: `,
            err instanceof Error ? err.message : err
        );
    }
}
