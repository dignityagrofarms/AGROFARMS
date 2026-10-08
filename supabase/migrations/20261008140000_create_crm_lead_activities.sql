-- Migration: Create crm_lead_activities for Customer Lead Communication Logs
CREATE TABLE IF NOT EXISTS crm_lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL DEFAULT 'WhatsApp Message',
  message_summary TEXT NOT NULL,
  content TEXT,
  sent_by TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by lead_id
CREATE INDEX IF NOT EXISTS idx_crm_lead_activities_lead ON crm_lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_activities_created ON crm_lead_activities(created_at DESC);

-- Enable RLS
ALTER TABLE crm_lead_activities ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Allow service role full access on crm_lead_activities" ON crm_lead_activities
  FOR ALL USING (true);
