import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { SophtronClientV2 } from "@/app/lib/sophtron";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { sophtronCustomerId: true, name: true, email: true },
  });

  if (user?.sophtronCustomerId) {
    return NextResponse.json({ customerId: user.sophtronCustomerId });
  }

  try {
    const client = new SophtronClientV2();
    const customer = await client.createCustomer({
      UniqueId: randomUUID(),
      FirstName: user?.name || "User",
      LastName: session.user.id,
      Email: user?.email || "",
    });

    const customerId = customer.CustomerID || customer.Id;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { sophtronCustomerId: customerId },
    });

    return NextResponse.json({ customerId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
