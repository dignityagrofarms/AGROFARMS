-- Migration: Add batch_id to public.orders and public.preorders
-- Date: 2026-10-06

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.farm_batches(id) ON DELETE SET NULL;

ALTER TABLE public.preorders 
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.farm_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_batch_id ON public.orders(batch_id);
CREATE INDEX IF NOT EXISTS idx_preorders_batch_id ON public.preorders(batch_id);
