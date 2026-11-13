-- Migration: Unified one-day "Daily Log" fields on farm_activities
-- Date: 2026-11-13

ALTER TABLE public.farm_activities
  ADD COLUMN IF NOT EXISTS sick_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feed_given boolean,
  ADD COLUMN IF NOT EXISTS feed_brand text,
  ADD COLUMN IF NOT EXISTS water_given boolean,
  ADD COLUMN IF NOT EXISTS temperature text;

-- Only one Daily Log per batch per day
CREATE UNIQUE INDEX IF NOT EXISTS uq_farm_activities_daily_log
  ON public.farm_activities (batch_id, activity_date)
  WHERE activity_type = 'Daily Log' AND batch_id IS NOT NULL;
