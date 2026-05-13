-- Migration 004 — capture the SE's intent (email, use case, opp/customer)
-- collected by the front-end tracking modal before any download/deploy.
-- Until this migration shipped, the form was a consent-theatre: data was
-- only used to flip a sessionStorage flag, never persisted.

CREATE TABLE IF NOT EXISTS tracking_intents (
    id               BIGSERIAL PRIMARY KEY,
    ts               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    email            TEXT,
    reason           TEXT,
    opp_or_customer  TEXT,
    source_page      TEXT,
    ip_hash          TEXT
);
CREATE INDEX IF NOT EXISTS idx_tracking_intents_ts    ON tracking_intents (ts DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_intents_email ON tracking_intents (email);
