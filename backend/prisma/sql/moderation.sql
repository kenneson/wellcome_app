-- Moderação de conteúdo (denúncia + bloqueio) — Apple 1.2 / Google UGC.
-- Aplicar no Supabase (SQL editor) OU rodar `npx prisma db push` no backend.
-- Idempotente: seguro rodar mais de uma vez.

DO $$ BEGIN
  CREATE TYPE "public"."ReportTargetType" AS ENUM ('EVENT', 'USER', 'REVIEW');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'SCAM', 'VIOLENCE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."ReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "public"."reports" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reporter_id" uuid NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
  "target_type" "public"."ReportTargetType" NOT NULL,
  "target_id"   uuid NOT NULL,
  "reason"      "public"."ReportReason" NOT NULL,
  "details"     text,
  "status"      "public"."ReportStatus" NOT NULL DEFAULT 'PENDING',
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  "reviewed_at" timestamptz,
  "reviewed_by" uuid
);
CREATE INDEX IF NOT EXISTS "idx_reports_status" ON "public"."reports"("status");
CREATE INDEX IF NOT EXISTS "idx_reports_target" ON "public"."reports"("target_type", "target_id");

CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "blocker_id" uuid NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
  "blocked_id" uuid NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "user_blocks_unique" UNIQUE ("blocker_id", "blocked_id")
);
CREATE INDEX IF NOT EXISTS "idx_user_blocks_blocker" ON "public"."user_blocks"("blocker_id");
