-- ============================================================
-- Migration: Sequential Feed Bag Inventory & Usage Tracking
-- Date: 2026-11-13
-- ============================================================

-- 1. Track bag quantity, weight per bag, and feed brand on Feed purchases
ALTER TABLE public.farm_financials
  ADD COLUMN IF NOT EXISTS feed_bags numeric(10, 2),
  ADD COLUMN IF NOT EXISTS feed_kg_per_bag numeric(6, 2),
  ADD COLUMN IF NOT EXISTS feed_brand text;

-- 2. Track sequential Bag # opened/finished and cumulative bags used on Daily Logs / Feeding activities
ALTER TABLE public.farm_activities
  ADD COLUMN IF NOT EXISTS feed_bag_no integer,
  ADD COLUMN IF NOT EXISTS feed_bag_status text CHECK (feed_bag_status IN ('opened', 'finished')),
  ADD COLUMN IF NOT EXISTS feed_bags_used numeric(10, 2);

CREATE INDEX IF NOT EXISTS idx_farm_activities_feed_bag_no
  ON public.farm_activities (batch_id, activity_date)
  WHERE feed_bag_no IS NOT NULL;
