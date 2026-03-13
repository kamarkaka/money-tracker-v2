import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { SophtronClientV2 } from "@/app/lib/sophtron";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { endpoint, params } = (await request.json()) as {
      endpoint: string;
      params: Record<string, string>;
    };

    const client = new SophtronClientV2();
    let result: unknown;

    switch (endpoint) {
      // Customer
      case "getCustomers":
        result = await client.getCustomers(params.uniqueId || undefined);
        break;
      case "createCustomer":
        result = await client.createCustomer(JSON.parse(params.body));
        break;
      case "getCustomerById":
        result = await client.getCustomerById(params.id);
        break;
      case "updateCustomer":
        result = await client.updateCustomer(params.id, JSON.parse(params.body));
        break;
      case "deleteCustomer":
        result = await client.deleteCustomer(params.id);
        break;

      // Institution
      case "searchInstitutions":
        result = await client.searchInstitutions(
          params.query || undefined,
          params.type ? Number(params.type) : undefined,
          params.extensive ? params.extensive === "true" : undefined,
        );
        break;

      // Member
      case "createMember":
        result = await client.createMember(
          params.customerId,
          params.jobType,
          JSON.parse(params.body),
        );
        break;
      case "getMembers":
        result = await client.getMembers(params.customerId);
        break;
      case "getMemberById":
        result = await client.getMemberById(params.customerId, params.memberId);
        break;
      case "deleteMember":
        result = await client.deleteMember(params.customerId, params.memberId);
        break;
      case "refreshMember":
        result = await client.refreshMember(
          params.customerId,
          params.memberId,
          params.jobType,
        );
        break;
      case "updateMember":
        result = await client.updateMember(
          params.customerId,
          params.memberId,
          params.jobType,
          JSON.parse(params.body),
        );
        break;

      // Account
      case "getAccountsByMember":
        result = await client.getAccountsByMember(params.customerId, params.memberId);
        break;
      case "getAccountsByCustomer":
        result = await client.getAccountsByCustomer(params.customerId);
        break;
      case "getAccountById":
        result = await client.getAccountById(params.customerId, params.accountId);
        break;
      case "getAccountHoldings":
        result = await client.getAccountHoldings(params.customerId, params.accountId);
        break;
      case "getTransactions":
        result = await client.getTransactions(
          params.customerId,
          params.accountId,
          params.startDate,
          params.endDate,
        );
        break;

      // Job
      case "getJob":
        result = await client.getJob(params.id);
        break;
      case "answerJobChallenge":
        result = await client.answerJobChallenge(
          params.id,
          params.challengeType,
          JSON.parse(params.body),
        );
        break;

      default:
        return NextResponse.json({ error: `Unknown endpoint: ${endpoint}` }, { status: 400 });
    }

    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
