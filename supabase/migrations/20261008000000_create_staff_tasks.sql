-- Migration: Create Staff Tasks Table
-- Date: 2026-10-08

CREATE TABLE public.staff_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT NOT NULL,
    assigned_to TEXT NOT NULL, -- e.g., 'manager1', 'staff2', or 'everyone'
    assigned_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' or 'completed'
    completed_at TIMESTAMPTZ,
    completed_by TEXT
);

-- Note: Access is managed entirely securely via server actions with supabaseAdmin
