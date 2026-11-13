-- Additive integrity foundation. Public access is removed in a separate rollout step.
CREATE TABLE public.record_audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  action text NOT NULL,
  actor_username text,
  actor_name text,
  actor_role text,
  recorded_by text,
  before_data jsonb,
  after_data jsonb,
  revision integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.record_audit_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.record_audit_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.record_audit_events_id_seq TO service_role;
CREATE POLICY audit_server ON public.record_audit_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX audit_source ON public.record_audit_events(source_table, source_id, id);
CREATE INDEX audit_submitter ON public.record_audit_events(recorded_by, created_at DESC);

CREATE FUNCTION public.capture_record_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  before_row jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) - 'passcode_hash' END;
  after_row jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) - 'passcode_hash' END;
  row_data jsonb;
  actor jsonb;
  display_name text;
  next_revision integer;
BEGIN
  row_data := coalesce(after_row, before_row);
  actor := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb ->> 'x-daf-actor';
  SELECT full_name INTO display_name FROM public.admin_access WHERE username = actor->>'username';
  SELECT coalesce(max(revision), 0) + 1 INTO next_revision FROM public.record_audit_events
    WHERE source_table = TG_TABLE_NAME AND source_id = (row_data->>'id')::uuid;
  INSERT INTO public.record_audit_events(source_table, source_id, action, actor_username, actor_name,
    actor_role, recorded_by, before_data, after_data, revision)
  VALUES (TG_TABLE_NAME, (row_data->>'id')::uuid,
    CASE WHEN TG_OP = 'UPDATE' AND before_row->>'approval_status' IS DISTINCT FROM after_row->>'approval_status'
      THEN coalesce(after_row->>'approval_status', 'updated') ELSE lower(TG_OP) END,
    actor->>'username', coalesce(nullif(display_name, ''), actor->>'username'), actor->>'role',
    coalesce(before_row->>'recorded_by', after_row->>'recorded_by'), before_row, after_row, next_revision);
  RETURN coalesce(NEW, OLD);
END $$;

DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['farm_batches','farm_financials','farm_activities','contact_transactions',
    'farm_financial_payments','orders','preorders','preorder_payments','partner_financials','partner_activities','farm_partners'] LOOP
    EXECUTE format('CREATE TRIGGER capture_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_record_audit()', tbl);
  END LOOP;
END $$;

-- Dismissal is personal presentation state, never deletion of evidence.
CREATE TABLE public.submission_dismissals (
  username text NOT NULL, source_table text NOT NULL, source_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(username, source_table, source_id)
);
ALTER TABLE public.submission_dismissals ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.submission_dismissals TO service_role;
CREATE POLICY dismissal_server ON public.submission_dismissals FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.farm_financials ADD COLUMN source_contact_id uuid UNIQUE REFERENCES public.contact_transactions(id) ON DELETE CASCADE;
ALTER TABLE public.contact_transactions ADD COLUMN sync_to_farm boolean NOT NULL DEFAULT false;
ALTER TABLE public.partner_financials ADD COLUMN source_financial_id uuid REFERENCES public.farm_financials(id) ON DELETE SET NULL;
ALTER TABLE public.partner_activities ADD COLUMN source_activity_id uuid REFERENCES public.farm_activities(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX partner_financial_source ON public.partner_financials(partner_id, source_financial_id) WHERE source_financial_id IS NOT NULL;
CREATE UNIQUE INDEX partner_activity_source ON public.partner_activities(partner_id, source_activity_id) WHERE source_activity_id IS NOT NULL;

CREATE FUNCTION public.sync_contact_financial() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bird_count integer; BEGIN
  IF NOT NEW.sync_to_farm OR NEW.batch_id IS NULL OR NEW.transaction_type NOT IN ('sale_to_contact','purchase_from_supplier') THEN
    DELETE FROM public.farm_financials WHERE source_contact_id = NEW.id;
    RETURN NEW;
  END IF;
  bird_count := CASE WHEN NEW.transaction_type = 'sale_to_contact'
    AND (coalesce(NEW.unit,'') || ' ' || NEW.item_description) ~* '(bird|broiler|chicken|hen|layer|cockerel)'
    AND (coalesce(NEW.unit,'') || ' ' || NEW.item_description) !~* '(egg|crate|manure)'
    THEN round(NEW.quantity)::integer END;
  INSERT INTO public.farm_financials(source_contact_id, batch_id, type, category, amount, amount_paid,
    description, payment_method, transaction_date, reference_no, approval_status, rejection_reason, recorded_by, birds_sold, feed_bags, feed_kg_per_bag)
  VALUES (NEW.id, NEW.batch_id, CASE WHEN NEW.transaction_type = 'sale_to_contact' THEN 'income' ELSE 'expense' END,
    CASE WHEN NEW.transaction_type = 'sale_to_contact' THEN 'Offload Bird Sales / Bulk Sale'
      WHEN NEW.item_description ~* 'feed' THEN 'Feed' ELSE 'Supplies' END,
    NEW.total_amount, NEW.amount_paid, NEW.item_description, NEW.payment_method, NEW.transaction_date,
    NEW.reference_no, NEW.approval_status, NEW.rejection_reason, NEW.recorded_by, bird_count,
    CASE WHEN NEW.transaction_type = 'purchase_from_supplier' AND NEW.item_description ~* 'feed' AND NEW.unit ~* 'bag' THEN NEW.quantity END,
    CASE WHEN NEW.transaction_type = 'purchase_from_supplier' AND NEW.item_description ~* 'feed' AND NEW.unit ~* 'bag' THEN 25 END)
  ON CONFLICT (source_contact_id) DO UPDATE SET batch_id = excluded.batch_id, type = excluded.type,
    category = excluded.category, amount = excluded.amount, amount_paid = excluded.amount_paid,
    description = excluded.description, payment_method = excluded.payment_method, transaction_date = excluded.transaction_date,
    reference_no = excluded.reference_no, approval_status = excluded.approval_status, rejection_reason = excluded.rejection_reason,
    birds_sold = excluded.birds_sold, feed_bags = excluded.feed_bags, feed_kg_per_bag = excluded.feed_kg_per_bag;
  RETURN NEW;
END $$;
CREATE TRIGGER contact_financial_sync AFTER INSERT OR UPDATE ON public.contact_transactions FOR EACH ROW EXECUTE FUNCTION public.sync_contact_financial();

-- Serializes payments on the parent row; trigger and payment write share a transaction.
CREATE FUNCTION public.apply_financial_payment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE parent public.farm_financials; delta numeric := 0; BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.financial_id <> OLD.financial_id OR NEW.amount <> OLD.amount) THEN
    RAISE EXCEPTION 'Payment amount and parent are immutable; reverse and record a new payment';
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.approval_status = 'approved' THEN delta := NEW.amount; END IF;
  IF TG_OP <> 'INSERT' AND OLD.approval_status = 'approved' THEN delta := delta - OLD.amount; END IF;
  SELECT * INTO parent FROM public.farm_financials WHERE id = coalesce(NEW.financial_id, OLD.financial_id) FOR UPDATE;
  IF NOT FOUND THEN RETURN coalesce(NEW, OLD); END IF;
  IF delta > 0 AND parent.approval_status <> 'approved' THEN RAISE EXCEPTION 'Approve the original transaction first'; END IF;
  IF coalesce(parent.amount_paid, parent.amount) + delta > parent.amount THEN RAISE EXCEPTION 'Payment exceeds remaining balance'; END IF;
  UPDATE public.farm_financials SET amount_paid = greatest(0, coalesce(amount_paid, amount) + delta) WHERE id = parent.id AND delta <> 0;
  RETURN coalesce(NEW, OLD);
END $$;
CREATE TRIGGER apply_payment BEFORE INSERT OR UPDATE OR DELETE ON public.farm_financial_payments FOR EACH ROW EXECUTE FUNCTION public.apply_financial_payment();

CREATE TABLE public.batch_stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), batch_id uuid NOT NULL REFERENCES public.farm_batches(id),
  quantity integer NOT NULL, reason text NOT NULL CHECK(length(trim(reason)) > 0),
  recorded_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.batch_stock_adjustments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.batch_stock_adjustments TO service_role;
CREATE POLICY stock_server ON public.batch_stock_adjustments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER capture_audit AFTER INSERT OR UPDATE OR DELETE ON public.batch_stock_adjustments FOR EACH ROW EXECUTE FUNCTION public.capture_record_audit();
