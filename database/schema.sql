-- ============================================================
-- CivicGrid — Supabase PostgreSQL + PostGIS Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable PostGIS extension (Supabase supports this natively)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('citizen', 'resolver', 'admin');

CREATE TYPE issue_category AS ENUM (
  'pothole',
  'water_leak',
  'broken_streetlight',
  'garbage_overflow',
  'fallen_tree',
  'road_damage',
  'graffiti',
  'flooding',
  'sewage_overflow',
  'other'
);

CREATE TYPE issue_status AS ENUM (
  'open',
  'assigned',
  'in_progress',
  'resolved',
  'escalated',
  'closed'
);

CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'push');

CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');

-- ────────────────────────────────────────────────────────────
-- USERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email               TEXT UNIQUE NOT NULL,
  full_name           TEXT NOT NULL,
  password_hash       TEXT,
  role                user_role NOT NULL DEFAULT 'citizen',
  civic_trust_score   INTEGER NOT NULL DEFAULT 0,
  avatar_url          TEXT,
  phone               TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast email lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

-- ────────────────────────────────────────────────────────────
-- ISSUES
-- ────────────────────────────────────────────────────────────
CREATE TABLE issues (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title               TEXT NOT NULL,
  description         TEXT,

  -- AI-classified fields
  category            issue_category NOT NULL DEFAULT 'other',
  severity_score      INTEGER NOT NULL DEFAULT 0 CHECK (severity_score BETWEEN 0 AND 10),
  severity_level      severity_level NOT NULL DEFAULT 'low',
  ai_description      TEXT,

  -- Status & workflow
  status              issue_status NOT NULL DEFAULT 'open',
  department          TEXT,
  assigned_to         UUID REFERENCES users(id),

  -- Geospatial (PostGIS)
  -- location is stored as GEOMETRY(Point, 4326) — WGS84
  location            GEOMETRY(Point, 4326) NOT NULL,
  address_text        TEXT,

  -- Media
  media_urls          TEXT[] NOT NULL DEFAULT '{}',
  proof_media_urls    TEXT[] NOT NULL DEFAULT '{}',

  -- Reporter
  reporter_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- SLA
  sla_hours           INTEGER NOT NULL DEFAULT 48,
  sla_deadline        TIMESTAMPTZ,
  escalated_at        TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,

  -- RPA
  rpa_form_submitted  BOOLEAN NOT NULL DEFAULT FALSE,
  rpa_reference_id    TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial index (GIST) — critical for PostGIS radius queries
CREATE INDEX idx_issues_location ON issues USING GIST(location);
CREATE INDEX idx_issues_status    ON issues(status);
CREATE INDEX idx_issues_category  ON issues(category);
CREATE INDEX idx_issues_reporter  ON issues(reporter_id);
CREATE INDEX idx_issues_sla       ON issues(sla_deadline);

-- ────────────────────────────────────────────────────────────
-- CO-REPORTERS (Deduplication merges)
-- ────────────────────────────────────────────────────────────
CREATE TABLE issue_co_reporters (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id    UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(issue_id, user_id)
);

CREATE INDEX idx_co_reporters_issue ON issue_co_reporters(issue_id);
CREATE INDEX idx_co_reporters_user  ON issue_co_reporters(user_id);

-- ────────────────────────────────────────────────────────────
-- AGENT LOGS
-- ────────────────────────────────────────────────────────────
CREATE TABLE agent_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id        UUID REFERENCES issues(id) ON DELETE SET NULL,
  agent_name      TEXT NOT NULL,
  input_payload   JSONB,
  output_payload  JSONB,
  success         BOOLEAN NOT NULL DEFAULT TRUE,
  error_message   TEXT,
  duration_ms     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_logs_issue ON agent_logs(issue_id);
CREATE INDEX idx_agent_logs_agent ON agent_logs(agent_name);

-- ────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id    UUID REFERENCES issues(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel     notification_channel NOT NULL DEFAULT 'email',
  subject     TEXT,
  body        TEXT,
  status      notification_status NOT NULL DEFAULT 'pending',
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user  ON notifications(user_id);
CREATE INDEX idx_notifications_issue ON notifications(issue_id);

-- ────────────────────────────────────────────────────────────
-- ESCALATION SOCIAL POSTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE social_posts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id      UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL,           -- 'twitter' | 'instagram'
  caption       TEXT NOT NULL,
  post_id       TEXT,                    -- platform's returned post ID
  posted_at     TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_social_posts_issue ON social_posts(issue_id);

-- ────────────────────────────────────────────────────────────
-- SUPABASE RPC — PostGIS Spatial Query Functions
-- Used by the Deduplication Agent (50-meter radius check)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION nearby_issues(
  lat      FLOAT,
  lng      FLOAT,
  radius_m INTEGER DEFAULT 50,
  cat      issue_category DEFAULT NULL
)
RETURNS TABLE (
  id              UUID,
  title           TEXT,
  category        issue_category,
  status          issue_status,
  severity_score  INTEGER,
  distance_m      FLOAT,
  created_at      TIMESTAMPTZ
)
LANGUAGE sql
AS $$
  SELECT
    i.id,
    i.title,
    i.category,
    i.status,
    i.severity_score,
    ST_Distance(
      i.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance_m,
    i.created_at
  FROM issues i
  WHERE
    ST_DWithin(
      i.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_m
    )
    AND (cat IS NULL OR i.category = cat)
    AND i.status NOT IN ('closed', 'resolved')
  ORDER BY distance_m ASC;
$$;

-- ────────────────────────────────────────────────────────────
-- UPDATED_AT Trigger
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (Supabase RLS)
-- ────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_co_reporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read all issues (public map)
CREATE POLICY "Issues are publicly readable"
  ON issues FOR SELECT USING (TRUE);

-- Only reporter can update their own issues
CREATE POLICY "Reporter can update own issue"
  ON issues FOR UPDATE
  USING (auth.uid()::TEXT = reporter_id::TEXT);

-- Resolvers and admins can update any issue
CREATE POLICY "Resolvers can update issues"
  ON issues FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::TEXT = auth.uid()::TEXT
      AND role IN ('resolver', 'admin')
    )
  );

-- Users read their own notifications
CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid()::TEXT = user_id::TEXT);

-- ────────────────────────────────────────────────────────────
-- CIVIC TRUST SCORE — Increment RPC
-- Called by Orchestrator and DedupAgent to award points
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_civic_trust(
  user_id UUID,
  points  INTEGER DEFAULT 10
)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE users
  SET civic_trust_score = civic_trust_score + points
  WHERE id = user_id;
$$;
