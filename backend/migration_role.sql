DO $$ BEGIN
    CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "role" "public"."Role" NOT NULL DEFAULT 'USER';
