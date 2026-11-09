-- Migration: Partner Multi-Cycle History, Manager Approval Gate, Evidence Attachments & Payout Elections
-- Date: 2026-11-09

-- 1. Add multi-cycle history and payout/rollover election fields to farm_partners
ALTER TABLE public.farm_partners
  ADD COLUMN IF NOT EXISTS archived_cycles jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payout_election jsonb;

-- 2. Add approval status, receipt attachments, and cycle tagging to partner_financials
ALTER TABLE public.partner_financials
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('approved', 'pending_approval', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS receipt_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS cycle_name text;

-- 3. Add approval status, pen photo attachments, and cycle tagging to partner_activities
ALTER TABLE public.partner_activities
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('approved', 'pending_approval', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS cycle_name text;

-- Indexes for pending approval lookups
CREATE INDEX IF NOT EXISTS idx_partner_financials_approval ON public.partner_financials(approval_status);
CREATE INDEX IF NOT EXISTS idx_partner_activities_approval ON public.partner_activities(approval_status);
