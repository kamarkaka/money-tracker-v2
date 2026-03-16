import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

interface ColumnMapping {
  date: number;
  description: number;
  amount?: number;
  debit?: number;
  credit?: number;
}

function parseDate(value: string, format: string): Date | null {
  const clean = value.trim();
  if (!clean) return null;

  let year: number, month: number, day: number;

  if (format === "YYYY-MM-DD") {
    const parts = clean.split("-");
    if (parts.length !== 3) return null;
    [year, month, day] = parts.map(Number);
  } else if (format === "MM/DD/YYYY") {
    const parts = clean.split("/");
    if (parts.length !== 3) return null;
    [month, day, year] = parts.map(Number);
  } else if (format === "DD/MM/YYYY") {
    const parts = clean.split("/");
    if (parts.length !== 3) return null;
    [day, month, year] = parts.map(Number);
  } else {
    // Try native parsing as fallback
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  }

  if (!year || !month || !day) return null;
  const d = new Date(year, month - 1, day);
  return isNaN(d.getTime()) ? null : d;
}

function parseAmount(value: string): number {
  // Remove currency symbols, commas, whitespace
  const clean = value.replace(/[^0-9.\-+]/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { accountId, columnMapping, dateFormat, rows } = body as {
    accountId: string;
    columnMapping: ColumnMapping;
    dateFormat: string;
    rows: string[][];
  };

  if (!accountId || !columnMapping || !rows || !Array.isArray(rows)) {
    return NextResponse.json(
      { error: "accountId, columnMapping, and rows are required" },
      { status: 400 }
    );
  }

  // Verify account belongs to user
  const account = await prisma.account.findUnique({
    where: { id: accountId, userId: session.user.id },
  });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const hasAmountCol = columnMapping.amount !== undefined;
  const hasDebitCredit = columnMapping.debit !== undefined || columnMapping.credit !== undefined;
  if (!hasAmountCol && !hasDebitCredit) {
    return NextResponse.json(
      { error: "Column mapping must include either amount, or debit/credit columns" },
      { status: 400 }
    );
  }

  let imported = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const dateStr = row[columnMapping.date];
      const description = row[columnMapping.description]?.trim();

      if (!dateStr || !description) {
        skipped++;
        continue;
      }

      const date = parseDate(dateStr, dateFormat || "MM/DD/YYYY");
      if (!date) {
        skipped++;
        continue;
      }

      let amount: number;
      if (hasAmountCol) {
        amount = parseAmount(row[columnMapping.amount!]);
      } else {
        const debit = columnMapping.debit !== undefined ? parseAmount(row[columnMapping.debit] || "0") : 0;
        const credit = columnMapping.credit !== undefined ? parseAmount(row[columnMapping.credit] || "0") : 0;
        amount = credit - debit;
      }

      await tx.transaction.create({
        data: {
          userId: session.user!.id!,
          accountId,
          description,
          amount,
          date,
          isManual: true,
        },
      });
      imported++;
    }
  });

  return NextResponse.json({ imported, skipped }, { status: 201 });
}
