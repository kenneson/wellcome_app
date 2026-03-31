-- Atualizar tabela profiles (User)
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "wallet_balance" DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "pix_key" TEXT;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "pix_key_type" TEXT;

-- Atualizar tabela payments (Pagamentos)
ALTER TABLE "public"."payments" ADD COLUMN IF NOT EXISTS "platform_fee" DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE "public"."payments" ADD COLUMN IF NOT EXISTS "net_amount" DECIMAL(10, 2) DEFAULT 0;

-- Criar enums caso não existam
DO $$ BEGIN
    CREATE TYPE "public"."WithdrawalStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."TransactionType" AS ENUM ('CREDIT_EVENT_TICKET', 'DEBIT_WITHDRAWAL', 'REFUND_WITHDRAWAL_FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela WithdrawalRequests
CREATE TABLE IF NOT EXISTS "public"."withdrawal_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(10, 2) NOT NULL,
    "pix_key" TEXT NOT NULL,
    "pix_key_type" TEXT,
    "status" "public"."WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "efi_end_to_end_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- Tabela WalletTransactions
CREATE TABLE IF NOT EXISTS "public"."wallet_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(10, 2) NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "description" TEXT,
    "reference_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_withdrawals_user" ON "public"."withdrawal_requests"("user_id");
CREATE INDEX IF NOT EXISTS "idx_wallet_txs_user" ON "public"."wallet_transactions"("user_id");

-- Foreign Keys (Ignoring constraint already exists errors gracefully via DO block for safety)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'withdrawal_requests_user_id_fkey') THEN
        ALTER TABLE "public"."withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallet_transactions_user_id_fkey') THEN
        ALTER TABLE "public"."wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
