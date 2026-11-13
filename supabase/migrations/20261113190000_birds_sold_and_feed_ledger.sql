-- Migration: 20261113190000_birds_sold_and_feed_ledger.sql
-- Adds explicit `birds_sold` tracking column to `farm_financials` so bird sales deduct
-- from batch live-bird headcount, and closes out stale physical headcount on already
-- completed/archived batches (e.g. First Batch August/September showing residual 5 birds).

ALTER TABLE public.farm_financials
  ADD COLUMN IF NOT EXISTS birds_sold integer DEFAULT NULL;

COMMENT ON COLUMN public.farm_financials.birds_sold IS
  'Number of live or dressed birds sold in this income transaction (used to deduct from batch live headcount).';

-- Historical stock must be reconciled explicitly with an owner reason.
-- Do not silently overwrite current_headcount on existing closed batches.
