-- Migration: Fix Farm Activities Activity Type Check Constraint
-- Date: 2026-10-07

-- Drop old restrictive check constraint on farm_activities table if exists
ALTER TABLE public.farm_activities DROP CONSTRAINT IF EXISTS farm_activities_activity_type_check;

-- Add flexible check constraint
ALTER TABLE public.farm_activities ADD CONSTRAINT farm_activities_activity_type_check CHECK (length(activity_type) > 0);
