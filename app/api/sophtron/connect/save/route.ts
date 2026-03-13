import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { SophtronClientV2 } from "@/app/lib/sophtron";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const { institutionName, memberId: requestMemberId } = await request.json();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { sophtronCustomerId: true },
    });

    if (!user?.sophtronCustomerId) {
      return NextResponse.json({ error: "Sophtron customer not set up" }, { status: 400 });
    }

    const client = new SophtronClientV2();
    const sophtronCustomerId = user.sophtronCustomerId;

    // Date range for transactions: current month
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    let institutionsUpserted = 0;
    let accountsUpserted = 0;
    let transactionsUpserted = 0;

    let membersToSync: string[];

    if (requestMemberId) {
      // Refresh: only sync the specific member
      membersToSync = [requestMemberId];
    } else {
      // New connection: find newly added members
      const sophtronMembers = await client.getMembers(sophtronCustomerId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allMemberIds = (sophtronMembers as any[]).map(
        (m) => m.MemberID || m.MemberId
      ).filter(Boolean);

      const existingInstitutions = await prisma.institution.findMany({
        where: { userId },
        select: { sophtronMemberId: true },
      });
      const existingMemberIds = new Set(existingInstitutions.map((i) => i.sophtronMemberId));

      const newMemberIds = allMemberIds.filter((id: string) => !existingMemberIds.has(id));
      membersToSync = newMemberIds.length > 0 ? newMemberIds : allMemberIds;
    }

    for (const mId of membersToSync) {
      // Upsert institution
      const institution = await prisma.institution.upsert({
        where: { userId_sophtronMemberId: { userId, sophtronMemberId: mId } },
        create: {
          id: randomUUID(),
          userId,
          sophtronMemberId: mId,
          name: institutionName || "New Institution",
        },
        update: {
          updatedAt: new Date(),
        },
      });
      institutionsUpserted++;

      // Fetch and upsert accounts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let sophtronAccounts: any[];
      try {
        sophtronAccounts = await client.getAccountsByMember(sophtronCustomerId, mId);
      } catch {
        continue;
      }
      if (!sophtronAccounts?.length) continue;

      for (const acct of sophtronAccounts) {
        const sophtronAccountId = acct.AccountId || acct.AccountID;
        if (!sophtronAccountId) continue;

        await prisma.account.upsert({
          where: { userId_sophtronAccountId: { userId, sophtronAccountId } },
          create: {
            id: randomUUID(),
            institutionId: institution.id,
            userId,
            sophtronAccountId,
            sophtronMemberId: mId,
            name: acct.AccountName || "Unknown",
            type: acct.AccountType || "unknown",
            subtype: acct.SubType || null,
            balance: acct.Balance ?? 0,
            currency: acct.BalanceCurrency || "USD",
          },
          update: {
            institutionId: institution.id,
            sophtronMemberId: mId,
            type: acct.AccountType || "unknown",
            subtype: acct.SubType || null,
            balance: acct.Balance ?? 0,
            currency: acct.BalanceCurrency || "USD",
            updatedAt: new Date(),
          },
        });
        accountsUpserted++;

        // Fetch and upsert transactions for this account
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let txns: any[];
        try {
          txns = await client.getTransactions(sophtronCustomerId, sophtronAccountId, startDate, endDate);
        } catch {
          continue;
        }
        if (!txns?.length) continue;

        const localAccount = await prisma.account.findUnique({
          where: { userId_sophtronAccountId: { userId, sophtronAccountId } },
          select: { id: true },
        });
        if (!localAccount) continue;

        for (const txn of txns) {
          const sophtronTransactionId = txn.TransactionID || txn.TransactionId;
          if (!sophtronTransactionId) continue;

          const txnType = (txn.Type || txn.TransactionType || "").toUpperCase();
          const rawAmount = Math.abs(txn.Amount ?? 0);
          const amount = txnType === "DEBIT" ? -rawAmount : rawAmount;

          try {
            const existing = await prisma.transaction.findFirst({
              where: { userId, sophtronTransactionId },
              select: { id: true },
            });

            if (existing) {
              await prisma.transaction.update({
                where: { id: existing.id },
                data: {
                  accountId: localAccount.id,
                  description: txn.Description || "Unknown",
                  amount,
                  date: new Date(txn.TransactionDate),
                  updatedAt: new Date(),
                },
              });
            } else {
              await prisma.transaction.create({
                data: {
                  id: randomUUID(),
                  userId,
                  accountId: localAccount.id,
                  sophtronTransactionId,
                  description: txn.Description || "Unknown",
                  amount,
                  date: new Date(txn.TransactionDate),
                },
              });
            }
            transactionsUpserted++;
          } catch {
            // skip individual transaction failures
          }
        }
      }

      // Update institution's updatedAt to reflect sync completion
      await prisma.institution.update({
        where: { id: institution.id },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      membersProcessed: membersToSync.length,
      institutionsUpserted,
      accountsUpserted,
      transactionsUpserted,
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
