-- ============================================================
-- Migration: Partner Auto-Sync Allocation & Per-Batch Staff Financial Visibility
-- Date: 2026-11-13
-- ============================================================

-- 1. Per-batch toggle allowing Admin/Owner to selectively grant staff financial report visibility (default OFF)
ALTER TABLE public.farm_batches
  ADD COLUMN IF NOT EXISTS show_financials_to_staff boolean NOT NULL DEFAULT false;

-- 2. Partner live batch pool allocation % and automatic ledger sync flag
ALTER TABLE public.farm_partners
  ADD COLUMN IF NOT EXISTS batch_allocation_percentage numeric(5, 2) NOT NULL DEFAULT 100
    CHECK (batch_allocation_percentage BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS auto_sync_batch boolean NOT NULL DEFAULT true;
