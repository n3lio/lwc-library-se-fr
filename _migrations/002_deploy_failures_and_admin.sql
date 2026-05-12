-- Migration 002 — track deploy failures + admin viewing flag
-- Idempotent (uses ADD COLUMN IF NOT EXISTS).

-- Capture per-component failure detail when a deploy is partial/failed.
-- JSONB array of { componentName, problem, problemType, ... } from Salesforce.
ALTER TABLE deploys
    ADD COLUMN IF NOT EXISTS failures JSONB;

-- Mark which feedbacks/submissions have been viewed by an admin (for unread badges).
ALTER TABLE feedbacks
    ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

ALTER TABLE submissions
    ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
