-- Migration 001 — initial schema for SE FR Library tracking + content tables.
-- Idempotent (safe to re-run). Executed by scripts/migrate.js at Heroku release phase.

-- ─── Tracking tables ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS visits (
    id          BIGSERIAL PRIMARY KEY,
    ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_hash     TEXT,
    user_agent  TEXT,
    referrer    TEXT,
    lang        TEXT,
    page        TEXT
);
CREATE INDEX IF NOT EXISTS idx_visits_ts ON visits (ts DESC);

CREATE TABLE IF NOT EXISTS downloads (
    id                 BIGSERIAL PRIMARY KEY,
    ts                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    component_api_name TEXT NOT NULL,
    recipe_id          TEXT,
    source_page        TEXT,
    ip_hash            TEXT
);
CREATE INDEX IF NOT EXISTS idx_downloads_ts            ON downloads (ts DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_component     ON downloads (component_api_name);
CREATE INDEX IF NOT EXISTS idx_downloads_recipe        ON downloads (recipe_id) WHERE recipe_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS deploys (
    id                 BIGSERIAL PRIMARY KEY,
    ts                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    components_csv     TEXT NOT NULL,
    recipe_id          TEXT,
    target_host        TEXT,
    sf_org_id          TEXT,
    sf_user_id         TEXT,
    sf_username        TEXT,
    deploy_request_id  TEXT,
    status             TEXT,
    num_total          INTEGER,
    num_success        INTEGER,
    source_page        TEXT,
    ip_hash            TEXT
);
CREATE INDEX IF NOT EXISTS idx_deploys_ts        ON deploys (ts DESC);
CREATE INDEX IF NOT EXISTS idx_deploys_username  ON deploys (sf_username) WHERE sf_username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deploys_org       ON deploys (sf_org_id) WHERE sf_org_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS likes (
    id                 BIGSERIAL PRIMARY KEY,
    ts                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    component_api_name TEXT NOT NULL,
    fingerprint        TEXT NOT NULL,
    -- One like per (component, fingerprint). Unliking deletes the row.
    CONSTRAINT likes_unique UNIQUE (component_api_name, fingerprint)
);
CREATE INDEX IF NOT EXISTS idx_likes_component ON likes (component_api_name);

-- ─── Content tables (forms) ─────────────────────────────────────────────────

-- Unified table for feedback / contact / showcase-request submissions.
-- Phase B will INSERT here from the 3 forms; Phase D admin will read.
CREATE TABLE IF NOT EXISTS feedbacks (
    id                  BIGSERIAL PRIMARY KEY,
    ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    kind                TEXT NOT NULL,        -- 'feedback' | 'contact' | 'showcase-request'
    subkind             TEXT,                  -- e.g. 'bug' | 'idea' | 'other' for kind='feedback'
    status              TEXT NOT NULL DEFAULT 'new', -- 'new' | 'triaged' | 'resolved'
    email               TEXT NOT NULL,
    subject             TEXT,
    message             TEXT NOT NULL,
    page                TEXT,
    attachment_blob     BYTEA,
    attachment_filename TEXT,
    attachment_mime     TEXT,
    assigned_to_id      BIGINT,
    resolved_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_feedbacks_ts     ON feedbacks (ts DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_kind   ON feedbacks (kind);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks (status);

-- Component contributions submitted by SEs.
CREATE TABLE IF NOT EXISTS submissions (
    id                          BIGSERIAL PRIMARY KEY,
    ts                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status                      TEXT NOT NULL DEFAULT 'pending',  -- pending | under_review | approved | rejected | published
    source                      TEXT NOT NULL DEFAULT 'zip_upload', -- zip_upload | org_connect (future)
    source_org_id               TEXT,
    author_name                 TEXT NOT NULL,
    author_email                TEXT NOT NULL,
    component_name              TEXT NOT NULL,
    description                 TEXT,
    use_case                    TEXT,
    attachment_blob             BYTEA,
    attachment_filename         TEXT,
    attachment_mime             TEXT,
    validation_status           TEXT NOT NULL DEFAULT 'pending', -- pending | passed | failed_with_errors
    validation_errors           JSONB,
    reviewer_id                 BIGINT,
    review_comments             JSONB,
    approved_at                 TIMESTAMPTZ,
    published_apex_class_name   TEXT,
    published_at                TIMESTAMPTZ,
    notes                       TEXT
);
CREATE INDEX IF NOT EXISTS idx_submissions_ts     ON submissions (ts DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions (status);

-- ─── Users (for future OAuth admin auth) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    sf_username     TEXT UNIQUE,
    sf_user_id      TEXT,
    role            TEXT NOT NULL DEFAULT 'contributor', -- 'admin' | 'contributor'
    display_name    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by_id   BIGINT REFERENCES users(id)
);

-- ─── Sessions (for password-based admin login V1) ──────────────────────────

-- Simple sessions table — used by /admin V1 (password + reset-by-email).
-- Will be replaced/augmented by OAuth Salesforce in Phase E.
CREATE TABLE IF NOT EXISTS admin_sessions (
    id           TEXT PRIMARY KEY,    -- sha256 of the session cookie value
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL,
    ip_hash      TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions (expires_at);

-- Migration tracking — to know what we've already run.
CREATE TABLE IF NOT EXISTS _migrations (
    name        TEXT PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
