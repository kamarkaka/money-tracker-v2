import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

interface ColumnMapping {
  date: number;
  description: number;
  amount?: number;
  debit?: number;
  credit?: number;
  category?: number;
  account?: number;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function parseMonthName(value: string): number | null {
  const key = value.trim().toLowerCase().slice(0, 3);
  return MONTH_NAMES[key] ?? null;
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
  } else if (format === "MMM/DD/YYYY") {
    const parts = clean.split("/");
    if (parts.length !== 3) return null;
    const m = parseMonthName(parts[0]);
    if (!m) return null;
    month = m;
    day = Number(parts[1]);
    year = Number(parts[2]);
  } else if (format === "MMM-DD-YYYY") {
    const parts = clean.split("-");
    if (parts.length !== 3) return null;
    const m = parseMonthName(parts[0]);
    if (!m) return null;
    month = m;
    day = Number(parts[1]);
    year = Number(parts[2]);
  } else {
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  }

  if (!year || !month || !day) return null;
  const d = new Date(year, month - 1, day);
  return isNaN(d.getTime()) ? null : d;
}

function parseAmount(value: string): number {
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
    accountId?: string;
    columnMapping: ColumnMapping;
    dateFormat: string;
    rows: string[][];
  };

  if (!columnMapping || !rows || !Array.isArray(rows)) {
    return NextResponse.json(
      { error: "columnMapping and rows are required" },
      { status: 400 }
    );
  }

  const hasAccountCol = columnMapping.account !== undefined;

  // accountId is required if no account column is mapped
  if (!hasAccountCol && !accountId) {
    return NextResponse.json(
      { error: "Either accountId or an account column mapping is required" },
      { status: 400 }
    );
  }

  const hasAmountCol = columnMapping.amount !== undefined;
  const hasDebitCredit = columnMapping.debit !== undefined || columnMapping.credit !== undefined;
  if (!hasAmountCol && !hasDebitCredit) {
    return NextResponse.json(
      { error: "Column mapping must include either amount, or debit/credit columns" },
      { status: 400 }
    );
  }

  // If a fixed accountId is given, verify it
  if (accountId) {
    const account = await prisma.account.findUnique({
      where: { id: accountId, userId: session.user.id },
    });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
  }

  // Pre-load user's accounts and categories for name matching
  const [userAccounts, userCategories] = await Promise.all([
    prisma.account.findMany({
      where: { userId: session.user.id, isHidden: false },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, parentId: true, parent: { select: { name: true } } },
    }),
  ]);

  // Build case-insensitive lookup maps
  const accountByName = new Map<string, string>();
  for (const a of userAccounts) {
    accountByName.set(a.name.toLowerCase(), a.id);
  }

  const categoryByName = new Map<string, string>();
  for (const c of userCategories) {
    categoryByName.set(c.name.toLowerCase(), c.id);
    // Also support "Parent > Child" format
    if (c.parent) {
      categoryByName.set(`${c.parent.name} > ${c.name}`.toLowerCase(), c.id);
    }
  }

  const hasCategoryCol = columnMapping.category !== undefined;

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

      // Resolve account
      let resolvedAccountId = accountId || null;
      if (hasAccountCol) {
        const acctName = row[columnMapping.account!]?.trim();
        if (acctName) {
          resolvedAccountId = accountByName.get(acctName.toLowerCase()) || null;
        }
        if (!resolvedAccountId) {
          skipped++;
          continue;
        }
      }
      if (!resolvedAccountId) {
        skipped++;
        continue;
      }

      // Resolve amount
      let amount: number;
      if (hasAmountCol) {
        amount = parseAmount(row[columnMapping.amount!]);
      } else {
        const debit = columnMapping.debit !== undefined ? parseAmount(row[columnMapping.debit] || "0") : 0;
        const credit = columnMapping.credit !== undefined ? parseAmount(row[columnMapping.credit] || "0") : 0;
        amount = credit - debit;
      }

      // Resolve category
      let categoryId: string | null = null;
      if (hasCategoryCol) {
        const catName = row[columnMapping.category!]?.trim();
        if (catName) {
          categoryId = categoryByName.get(catName.toLowerCase()) || null;
        }
      }

      await tx.transaction.create({
        data: {
          userId: session.user!.id!,
          accountId: resolvedAccountId,
          description,
          amount,
          date,
          categoryId,
          isManual: true,
        },
      });
      imported++;
    }
  });

  return NextResponse.json({ imported, skipped }, { status: 201 });
}
