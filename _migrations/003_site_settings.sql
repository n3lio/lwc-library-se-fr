-- Migration 003 — generic key/value site settings table.
-- First use: home page featured components (admin-controlled list).
-- Idempotent.

CREATE TABLE IF NOT EXISTS site_settings (
    key         TEXT PRIMARY KEY,
    value       JSONB NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  TEXT
);
