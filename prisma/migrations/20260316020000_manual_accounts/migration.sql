ALTER TABLE "institution" ALTER COLUMN "sophtron_member_id" DROP NOT NULL;
ALTER TABLE "institution" ADD COLUMN "is_manual" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "account" ALTER COLUMN "sophtron_member_id" DROP NOT NULL;
ALTER TABLE "account" ALTER COLUMN "sophtron_account_id" DROP NOT NULL;
ALTER TABLE "account" ADD COLUMN "is_manual" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "transaction" ALTER COLUMN "sophtron_transaction_id" DROP NOT NULL;
ALTER TABLE "transaction" ADD COLUMN "is_manual" BOOLEAN NOT NULL DEFAULT false;
