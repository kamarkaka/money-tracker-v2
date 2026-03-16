import { NextRequest, NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { prisma } from "@/app/lib/db";
import { ensureSophtronCustomer } from "@/app/lib/sophtron/create-customer";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password, name } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  console.log('Checking for existing user with email: ' + email);
  const existing = await prisma.user.findUnique({ where: { email } });
  console.log('Found existing user: ' + JSON.stringify(existing));

  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  console.log('no existing user found, creating new user with email: ' + email);

  const passwordHash = hashSync(password, 10);
  console.log("passwordHash:" + passwordHash);

  const user = await prisma.user.create({
    data: { email, passwordHash, name: name || null },
  });
  console.log("Created user:" + JSON.stringify(user));

  // Create Sophtron customer in the background
  ensureSophtronCustomer(user.id);

  return NextResponse.json(
    { id: user.id, email: user.email, name: user.name },
    { status: 201 }
  );
}
