import { BaseClient } from "./base-client";
import type {
  Account,
  BankTransaction,
  Customer,
  CustomerInput,
  Holding,
  Institution,
  JobInformation,
  Member,
  MemberInput,
  UpdateJobChallengeAnswer,
} from "./types";

export class SophtronClientV2 {
  private client: BaseClient;

  constructor() {
    this.client = new BaseClient();
  }

  // ── Customer endpoints ──

  async getCustomers(uniqueId?: string): Promise<Customer[]> {
    const params = uniqueId ? `?uniqueId=${encodeURIComponent(uniqueId)}` : "";
    return this.client.get<Customer[]>(`/api/v2/customers${params}`);
  }

  async createCustomer(data: CustomerInput): Promise<Customer> {
    return this.client.post<Customer>("/api/v2/customers", data);
  }

  async getCustomerById(id: string): Promise<Customer> {
    return this.client.get<Customer>(`/api/v2/customers/${id}`);
  }

  async updateCustomer(id: string, data: CustomerInput): Promise<Customer> {
    return this.client.put<Customer>(`/api/v2/customers/${id}`, data);
  }

  async deleteCustomer(id: string): Promise<void> {
    return this.client.del<void>(`/api/v2/customers/${id}`);
  }

  // ── Institution endpoints ──

  async searchInstitutions(
    query?: string,
    type?: number,
    extensive?: boolean,
  ): Promise<Institution[]> {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (type !== undefined) params.set("type", String(type));
    if (extensive !== undefined) params.set("extensive", String(extensive));
    const qs = params.toString();
    return this.client.get<Institution[]>(`/api/v2/institutions${qs ? `?${qs}` : ""}`);
  }

  // ── Member endpoints ──

  async createMember(
    customerId: string,
    jobType: string,
    data: MemberInput,
  ): Promise<Member> {
    return this.client.post<Member>(
      `/api/v2/Customers/${customerId}/Members/${jobType}`,
      data,
    );
  }

  async getMembers(customerId: string): Promise<Member[]> {
    return this.client.get<Member[]>(`/api/v2/Customers/${customerId}/Members`);
  }

  async getMemberById(customerId: string, memberId: string): Promise<Member> {
    return this.client.get<Member>(
      `/api/v2/Customers/${customerId}/Members/${memberId}`,
    );
  }

  async deleteMember(customerId: string, memberId: string): Promise<void> {
    return this.client.del<void>(
      `/api/v2/Customers/${customerId}/Members/${memberId}`,
    );
  }

  async refreshMember(
    customerId: string,
    memberId: string,
    jobType: string,
  ): Promise<Member> {
    return this.client.post<Member>(
      `/api/v2/Customers/${customerId}/Members/${memberId}/${jobType}`,
    );
  }

  async updateMember(
    customerId: string,
    memberId: string,
    jobType: string,
    data: MemberInput,
  ): Promise<Member> {
    return this.client.put<Member>(
      `/api/v2/Customers/${customerId}/Members/${memberId}/${jobType}`,
      data,
    );
  }

  // ── Account endpoints ──

  async getAccountsByMember(
    customerId: string,
    memberId: string,
  ): Promise<Account[]> {
    return this.client.get<Account[]>(
      `/api/v2/Customers/${customerId}/Members/${memberId}/accounts`,
    );
  }

  async getAccountsByCustomer(customerId: string): Promise<Account[]> {
    return this.client.get<Account[]>(
      `/api/v2/Customers/${customerId}/accounts`,
    );
  }

  async getAccountById(
    customerId: string,
    accountId: string,
  ): Promise<Account> {
    return this.client.get<Account>(
      `/api/v2/Customers/${customerId}/accounts/${accountId}`,
    );
  }

  async getAccountHoldings(
    customerId: string,
    accountId: string,
  ): Promise<Holding[]> {
    return this.client.get<Holding[]>(
      `/api/v2/Customers/${customerId}/accounts/${accountId}/holdings`,
    );
  }

  async getTransactions(
    customerId: string,
    accountId: string,
    startDate: string,
    endDate: string,
  ): Promise<BankTransaction[]> {
    const params = new URLSearchParams({
      startDate,
      endDate,
    });
    return this.client.get<BankTransaction[]>(
      `/api/v2/customers/${customerId}/accounts/${accountId}/transactions?${params}`,
    );
  }

  // ── Job endpoints ──

  async getJob(id: string): Promise<JobInformation> {
    return this.client.get<JobInformation>(`/api/v2/job/${id}`);
  }

  async answerJobChallenge(
    id: string,
    challengeType: string,
    data: UpdateJobChallengeAnswer,
  ): Promise<JobInformation> {
    console.log("answerJobChallenge job: " + id + ", challengeType: " + challengeType + ", data: " + JSON.stringify(data));
    return this.client.put<JobInformation>(
      `/api/v2/job/${id}/challenge/${challengeType}`,
      data,
    );
  }
}
