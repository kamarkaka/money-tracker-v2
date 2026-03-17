import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { SophtronClientV2 } from "@/app/lib/sophtron";
import { randomUUID } from "crypto";

export const maxDuration = 60;

const RANDOM_NAMES = [
  "Maple", "Cedar", "Birch", "Aspen", "Willow",
  "Coral", "Sage", "Flint", "Jade", "Reed",
  "Ember", "Frost", "Drift", "Crest", "Vale",
];

function randomName(): string {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const client = new SophtronClientV2();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { sophtronCustomerId: true },
    });

    if (!user?.sophtronCustomerId) {
      return NextResponse.json(
        { error: "No Sophtron customer linked. Please connect a bank account first." },
        { status: 400 }
      );
    }

    const sophtronCustomerId = user.sophtronCustomerId;
    const customer = await client.getCustomerById(sophtronCustomerId);

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found in Sophtron" },
        { status: 404 }
      );
    }

    const memberIds = customer.MemberIDs || [];

    let institutionsUpserted = 0;
    let accountsUpserted = 0;
    let transactionsUpserted = 0;

    // Date range for transactions: 12 months (current month + 11 prior months)
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().split("T")[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    for (const memberId of memberIds) {
      try {
        const institution = await prisma.institution.upsert({
          where: {
            userId_sophtronMemberId: { userId, sophtronMemberId: memberId },
          },
          create: {
            id: randomUUID(),
            userId,
            sophtronMemberId: memberId,
            name: randomName(),
          },
          update: {
            updatedAt: new Date(),
          },
        });
        institutionsUpserted++;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let sophtronAccounts: any[];
        try {
          sophtronAccounts = await client.getAccountsByMember(sophtronCustomerId, memberId);
        } catch {
          continue;
        }

        if (!sophtronAccounts || !Array.isArray(sophtronAccounts)) {
          continue;
        }

        for (const acct of sophtronAccounts) {
          const sophtronAccountId = acct.AccountId || acct.AccountID;
          if (!sophtronAccountId) continue;

          try {
            await prisma.account.upsert({
              where: {
                userId_sophtronAccountId: { userId, sophtronAccountId },
              },
              create: {
                id: randomUUID(),
                institutionId: institution.id,
                userId,
                sophtronAccountId,
                sophtronMemberId: memberId,
                name: acct.AccountName || "Unknown",
                type: acct.AccountType || "unknown",
                subtype: acct.SubType || null,
                balance: acct.Balance ?? 0,
                currency: acct.BalanceCurrency || "USD",
              },
              update: {
                institutionId: institution.id,
                sophtronMemberId: memberId,
                type: acct.AccountType || "unknown",
                subtype: acct.SubType || null,
                balance: acct.Balance ?? 0,
                currency: acct.BalanceCurrency || "USD",
                updatedAt: new Date(),
              },
            });
            accountsUpserted++;

            try {
              const sophtronTxns = await client.getTransactions(
                sophtronCustomerId,
                sophtronAccountId,
                startDate,
                endDate,
              );

              if (sophtronTxns && Array.isArray(sophtronTxns) && sophtronTxns.length > 0) {
                const localAccount = await prisma.account.findUnique({
                  where: { userId_sophtronAccountId: { userId, sophtronAccountId } },
                  select: { id: true },
                });
                if (!localAccount) continue;

                for (const txn of sophtronTxns) {
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
                    // Skip individual transaction failures
                  }
                }
              }
            } catch {
              // Skip transaction fetch failures for individual accounts
            }
          } catch {
            // Skip individual account upsert failures
          }
        }
      } catch {
        // Skip individual institution failures
      }
    }

    return NextResponse.json({
      success: true,
      memberCount: memberIds.length,
      institutionsUpserted,
      accountsUpserted,
      transactionsUpserted,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
