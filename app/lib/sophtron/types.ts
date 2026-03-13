// ── Enums ──

export enum InstitutionType {
  All = 0,
  Bank = 1,
  CreditCard = 2,
  Investment = 3,
  Mortgage = 4,
  Insurance = 5,
  Loan = 6,
  Tax = 7,
  Bill = 8,
  Utility = 9,
  Reward = 10,
}

export enum JobType {
  Verify = "verify",
  Agg = "agg",
  Fullhistory = "fullhistory",
  Identify = "identify",
}

export enum ChallengeType {
  Question = 0,
  Choice = 1,
  Image = 2,
  Token = 3,
}

// ── Customer ──

export interface Customer {
  Id: string;
  CustomerID: string;
  UniqueId: string;
  UniqueID: string;
  Name: string;
  FirstName: string;
  LastName: string;
  Email: string;
  MemberIDs: string[];
}

export interface CustomerInput {
  UniqueId?: string;
  FirstName?: string;
  LastName?: string;
  Email?: string;
}

// ── Institution ──

export interface LoginFormField {
  MappedField: string;
  DisplayText: string;
  Optional: boolean;
}

export interface InstitutionDetail {
  LoginFormUserName: string;
  LoginFormPassword: string;
  LoginFormFields: LoginFormField[];
}

export interface Institution {
  InstitutionId: string;
  InstitutionID: string;
  InstitutionName: string;
  InstitutionUrl: string;
  URL: string;
  Logo: string;
  InstitutionType: InstitutionType;
  InstitutionDetail: InstitutionDetail;
}

// ── Member ──

export interface Member {
  MemberId: string;
  CustomerId: string;
  InstitutionId: string;
  InstitutionName: string;
  Status: string;
  StatusMessage: string;
}

export interface MemberInput {
  InstitutionId: string;
  UserName?: string;
  Password?: string;
  Pin?: string;
}

// ── Account ──

export interface Account {
  AccountId: string;
  MemberId: string;
  AccountName: string;
  AccountType: string;
  AccountNumber: string;
  Balance: number;
  AvailableBalance: number;
  Currency: string;
}

// ── Holding ──

export interface Holding {
  HoldingId: string;
  AccountId: string;
  Symbol: string;
  Description: string;
  Quantity: number;
  Price: number;
  Value: number;
}

// ── Transaction ──

export interface BankTransaction {
  TransactionId: string;
  TransactionID: string;
  AccountId: string;
  Description: string;
  Amount: number;
  PostedDate: string;
  TransactionDate: string;
  TransactionType: string;
  Type: string;
  Category: string;
  Status: string;
}

// ── Job ──

export interface JobChallenge {
  ChallengeType: ChallengeType;
  Question: string;
  Data: string;
  Choices: string[];
}

export interface JobInformation {
  JobId: string;
  JobID: string;
  CustomerId: string;
  MemberId: string;
  Status: string;
  StatusMessage: string;
  Challenges: JobChallenge[];
  SuccessFlag: boolean;
  LastStep: string;
  TokenMethods: string;
  TokenInput: string;
}

export interface UpdateJobChallengeAnswer {
  answerText: string;
}
