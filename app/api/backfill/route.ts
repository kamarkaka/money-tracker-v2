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
  console.log("[backfill] Starting backfill...");

  const session = await auth();
  if (!session?.user?.id) {
    console.log("[backfill] Unauthorized - no session");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  console.log(`[backfill] User: ${userId}`);

  try {
    const client = new SophtronClientV2();

    // Get the current user's Sophtron customer ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { sophtronCustomerId: true },
    });

    if (!user?.sophtronCustomerId) {
      console.log("[backfill] User has no Sophtron customer ID");
      return NextResponse.json(
        { error: "No Sophtron customer linked. Please connect a bank account first." },
        { status: 400 }
      );
    }

    const sophtronCustomerId = user.sophtronCustomerId;
    console.log(`[backfill] Sophtron customer: ${sophtronCustomerId}`);

    // fetch members for this customer
    console.log("[backfill] Fetching customer details from Sophtron...");
    const customer = await client.getCustomerById(sophtronCustomerId);

    if (!customer) {
      console.log("[backfill] Customer not found");
      return NextResponse.json(
        { error: 'Customer not found in Sophtron' },
        { status: 404 }
      );
    }

    const memberIds = customer.MemberIDs || [];
    console.log(`[backfill] Found customer: ${sophtronCustomerId}, ${memberIds.length} members`);

    let institutionsUpserted = 0;
    let accountsUpserted = 0;
    let transactionsUpserted = 0;

    // Date range for transactions: 12 months (current month + 11 prior months)
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().split("T")[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    console.log(`[backfill] Transaction date range: ${startDate} to ${endDate}`);

    // Step 2 & 3: For each member, upsert institution then fetch & upsert accounts
    for (const memberId of memberIds) {
      console.log(`[backfill] Processing member: ${memberId}`);

      // Upsert institution
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
        console.log(`[backfill]   Institution upserted: ${institution.id} (${institution.name})`);

        // Fetch accounts from Sophtron for this member
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let sophtronAccounts: any[];
        try {
          console.log(`[backfill]   Fetching accounts for member ${memberId}...`);
          sophtronAccounts = await client.getAccountsByMember(sophtronCustomerId, memberId);
          console.log(`[backfill]   Got ${sophtronAccounts?.length ?? 0} accounts`);
        } catch (err) {
          console.error(`[backfill]   Failed to fetch accounts for member ${memberId}:`, err instanceof Error ? err.message : err);
          continue;
        }

        if (!sophtronAccounts || !Array.isArray(sophtronAccounts)) {
          console.log(`[backfill]   No accounts array returned for member ${memberId}`);
          continue;
        }

        for (const acct of sophtronAccounts) {
          const sophtronAccountId = acct.AccountId || acct.AccountID;
          if (!sophtronAccountId) {
            console.log(`[backfill]     Skipping account with no ID:`, JSON.stringify(acct).slice(0, 200));
            continue;
          }

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
            console.log(`[backfill]     Account upserted: ${acct.AccountName} (${sophtronAccountId})`);

            // Fetch and upsert transactions for this account
            try {
              console.log(`[backfill]     Fetching transactions for account ${sophtronAccountId}...`);
              const sophtronTxns = await client.getTransactions(
                sophtronCustomerId,
                sophtronAccountId,
                startDate,
                endDate,
              );
              console.log(`[backfill]     Got ${sophtronTxns?.length ?? 0} transactions`);

              if (sophtronTxns && Array.isArray(sophtronTxns) && sophtronTxns.length > 0) {
                // Log first transaction to inspect field names
                console.log(`[backfill]     Sample transaction keys:`, Object.keys(sophtronTxns[0]));
                console.log(`[backfill]     Sample transaction:`, JSON.stringify(sophtronTxns[0]).slice(0, 500));
                // Look up the local account ID
                const localAccount = await prisma.account.findUnique({
                  where: { userId_sophtronAccountId: { userId, sophtronAccountId } },
                  select: { id: true },
                });
                if (!localAccount) continue;

                for (const txn of sophtronTxns) {
                  const sophtronTransactionId = txn.TransactionID || txn.TransactionId;
                  if (!sophtronTransactionId) {
                    console.log(`[backfill]       Skipping txn with no TransactionId. Keys:`, Object.keys(txn));
                    continue;
                  }

                  // Amount: negative for DEBIT, positive for CREDIT
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
                  } catch (err) {
                    console.error(`[backfill]       Failed to upsert transaction ${sophtronTransactionId}:`, err instanceof Error ? err.message : err);
                  }
                }
              }
            } catch (err) {
              console.error(`[backfill]     Failed to fetch transactions for account ${sophtronAccountId}:`, err instanceof Error ? err.message : err);
            }
          } catch (err) {
            console.error(`[backfill]     Failed to upsert account ${sophtronAccountId}:`, err instanceof Error ? err.message : err);
          }
        }
      } catch (err) {
        console.error(`[backfill]   Failed to upsert institution for member ${memberId}:`, err instanceof Error ? err.message : err);
      }
    }

    console.log(`[backfill] Done. Institutions: ${institutionsUpserted}, Accounts: ${accountsUpserted}, Transactions: ${transactionsUpserted}`);

    return NextResponse.json({
      success: true,
      sophtronCustomerId,
      memberCount: memberIds.length,
      institutionsUpserted,
      accountsUpserted,
      transactionsUpserted,
    });
  } catch (err) {
    console.error("[backfill] Top-level error:", err instanceof Error ? err.stack : err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
