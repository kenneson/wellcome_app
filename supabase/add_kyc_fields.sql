-- Migration: Add KYC verification fields to profiles table
-- Run this in Supabase SQL Editor

-- 1. Create KYC status enum
DO $$ BEGIN
    CREATE TYPE public."KycStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add KYC columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_status public."KycStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
  ADD COLUMN IF NOT EXISTS kyc_document_url TEXT,
  ADD COLUMN IF NOT EXISTS kyc_selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS kyc_similarity_score DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;

-- 3. Create index for querying pending KYCs
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status ON public.profiles(kyc_status);

-- 4. Create storage bucket for KYC documents (run separately in Supabase Dashboard > Storage)
-- Bucket name: kyc-documents
-- Public: false (private)

-- 5. RLS policies for kyc-documents bucket
-- Users can upload to their own folder: {user_id}/document.jpg, {user_id}/selfie.jpg
-- Users can read their own files
-- Service role can read all files (for Edge Function)
