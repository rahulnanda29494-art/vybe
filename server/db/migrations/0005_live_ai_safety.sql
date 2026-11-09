-- 0005_live_ai_safety — live streaming, AI jobs, moderation and audit.

-- ------------------------------------------------------------------ live
CREATE TYPE stream_state AS ENUM ('scheduled', 'connecting', 'live', 'ended', 'errored', 'cancelled');

CREATE TABLE live_streams (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id      uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  video_id        uuid REFERENCES videos(id) ON DELETE SET NULL,   -- the replay, once recorded
  title           text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description     text NOT NULL DEFAULT '',
  category_id     uuid REFERENCES categories(id) ON DELETE SET NULL,
  state           stream_state NOT NULL DEFAULT 'scheduled',
  visibility      video_visibility NOT NULL DEFAULT 'public',
  -- Ingest credentials live with the provider; we keep only references.
  provider        text NOT NULL DEFAULT 'none',
  provider_ref    text,
  ingest_url      text,
  stream_key_hash text,                      -- hashed: the raw key is shown once
  playback_url    text,
  thumbnail_key   text,
  chat_enabled    boolean NOT NULL DEFAULT true,
  chat_slow_mode_s smallint NOT NULL DEFAULT 0 CHECK (chat_slow_mode_s >= 0),
  record_replay   boolean NOT NULL DEFAULT true,
  scheduled_for   timestamptz,
  started_at      timestamptz,
  ended_at        timestamptz,
  peak_viewers    integer NOT NULL DEFAULT 0,
  total_viewers   integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT live_streams_window CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX live_streams_live_idx     ON live_streams (state, started_at DESC) WHERE state = 'live';
CREATE INDEX live_streams_channel_idx  ON live_streams (channel_id, created_at DESC);
CREATE INDEX live_streams_upcoming_idx ON live_streams (scheduled_for) WHERE state = 'scheduled';
CREATE TRIGGER live_streams_touch BEFORE UPDATE ON live_streams
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE live_chat_messages (
  id          bigserial PRIMARY KEY,
  stream_id   uuid NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  body        text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  status      comment_status NOT NULL DEFAULT 'visible',
  is_member   boolean NOT NULL DEFAULT false,
  gift_minor  bigint NOT NULL DEFAULT 0 CHECK (gift_minor >= 0),
  removed_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_chat_stream_idx ON live_chat_messages (stream_id, created_at DESC);

CREATE TABLE live_viewer_sessions (
  id           bigserial PRIMARY KEY,
  stream_id    uuid NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES users(id) ON DELETE SET NULL,
  session_hash text NOT NULL,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  left_at      timestamptz,
  watched_s    integer NOT NULL DEFAULT 0
);
CREATE INDEX live_viewer_sessions_stream_idx ON live_viewer_sessions (stream_id, joined_at DESC);

-- -------------------------------------------------------------- AI jobs
-- One table for every AI task: generation, dubbing, highlights, metadata,
-- captions. Provider, model, usage and cost are recorded for every run.
CREATE TABLE ai_jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind             text NOT NULL CHECK (kind IN (
                     'script', 'metadata', 'thumbnail', 'dubbing', 'subtitles',
                     'highlights', 'summary', 'search_interpretation', 'moderation'
                   )),
  user_id          uuid REFERENCES users(id) ON DELETE SET NULL,
  channel_id       uuid REFERENCES channels(id) ON DELETE CASCADE,
  video_id         uuid REFERENCES videos(id) ON DELETE CASCADE,
  status           job_status NOT NULL DEFAULT 'queued',
  provider         text NOT NULL,            -- 'groq', 'openai', 'replicate'
  model            text NOT NULL,
  input            jsonb NOT NULL DEFAULT '{}'::jsonb,
  output           jsonb,
  output_keys      text[] NOT NULL DEFAULT '{}',   -- storage keys for produced media
  prompt_tokens    integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  cost_minor       bigint NOT NULL DEFAULT 0 CHECK (cost_minor >= 0),
  currency         char(3) NOT NULL DEFAULT 'USD',
  latency_ms       integer,
  attempts         smallint NOT NULL DEFAULT 0,
  error            text,
  reviewed_by      uuid REFERENCES users(id) ON DELETE SET NULL,  -- creator sign-off
  reviewed_at      timestamptz,
  idempotency_key  text UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_jobs_owner_idx  ON ai_jobs (channel_id, created_at DESC);
CREATE INDEX ai_jobs_status_idx ON ai_jobs (status, created_at) WHERE status IN ('queued', 'running');
CREATE INDEX ai_jobs_video_idx  ON ai_jobs (video_id, kind);
CREATE TRIGGER ai_jobs_touch BEFORE UPDATE ON ai_jobs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- --------------------------------------------------------------- safety
CREATE TYPE report_target AS ENUM ('video', 'comment', 'channel', 'user', 'live_stream', 'community_post');
CREATE TYPE report_state  AS ENUM ('open', 'triaged', 'actioned', 'dismissed');

CREATE TABLE content_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type   report_target NOT NULL,
  target_id     uuid NOT NULL,
  reporter_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  reason        text NOT NULL CHECK (reason IN (
                  'spam', 'sexual', 'violence', 'hate', 'harassment',
                  'harmful', 'child_safety', 'misinformation', 'copyright', 'other'
                )),
  details       text NOT NULL DEFAULT '' CHECK (char_length(details) <= 2000),
  state         report_state NOT NULL DEFAULT 'open',
  severity      smallint NOT NULL DEFAULT 3 CHECK (severity BETWEEN 1 AND 5),
  assigned_to   uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at   timestamptz,
  resolution    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_reports_queue_idx  ON content_reports (state, severity DESC, created_at)
  WHERE state IN ('open', 'triaged');
CREATE INDEX content_reports_target_idx ON content_reports (target_type, target_id);
CREATE TRIGGER content_reports_touch BEFORE UPDATE ON content_reports
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE moderation_actions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     uuid REFERENCES content_reports(id) ON DELETE SET NULL,
  target_type   report_target NOT NULL,
  target_id     uuid NOT NULL,
  action        text NOT NULL CHECK (action IN (
                  'none', 'warn', 'age_restrict', 'demonetize', 'remove',
                  'strike', 'suspend', 'ban', 'restore'
                )),
  reason        text NOT NULL,
  notes         text NOT NULL DEFAULT '',
  -- Consequential actions are taken by a person, never automatically.
  actor_id      uuid REFERENCES users(id) ON DELETE SET NULL,
  automated     boolean NOT NULL DEFAULT false,
  expires_at    timestamptz,
  reverted_at   timestamptz,
  reverted_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX moderation_actions_target_idx ON moderation_actions (target_type, target_id, created_at DESC);

CREATE TABLE copyright_claims (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id       uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  claimant_name  text NOT NULL,
  claimant_email citext NOT NULL,
  claimant_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  work_described text NOT NULL,
  timestamps     text,                       -- disputed ranges, free text
  state          text NOT NULL DEFAULT 'open'
                   CHECK (state IN ('open', 'upheld', 'rejected', 'counter_noticed', 'withdrawn')),
  action_taken   text CHECK (action_taken IN ('none', 'block', 'demonetize', 'remove')),
  counter_notice text,
  sworn_statement boolean NOT NULL DEFAULT false,
  reviewed_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX copyright_claims_video_idx ON copyright_claims (video_id, created_at DESC);
CREATE INDEX copyright_claims_queue_idx ON copyright_claims (state, created_at) WHERE state = 'open';
CREATE TRIGGER copyright_claims_touch BEFORE UPDATE ON copyright_claims
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------------------------------------------------------------- audit
-- Append-only. Every privileged action writes one row, including the actor,
-- what changed and where the request came from.
CREATE TABLE audit_logs (
  id           bigserial PRIMARY KEY,
  actor_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_role   user_role,
  action       text NOT NULL,                -- 'user.suspend', 'video.remove', 'payout.approve'
  entity_type  text NOT NULL,
  entity_id    text,
  before       jsonb,
  after        jsonb,
  reason       text,
  ip_hash      text,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_actor_idx  ON audit_logs (actor_id, created_at DESC);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX audit_logs_action_idx ON audit_logs (action, created_at DESC);

CREATE OR REPLACE FUNCTION audit_logs_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_no_change
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();

-- Account data requests (DPDP/GDPR export and erasure).
CREATE TABLE privacy_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('export', 'delete')),
  state        text NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'processing', 'completed', 'rejected')),
  export_key   text,                         -- storage key of the generated archive
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  notes        text NOT NULL DEFAULT ''
);
CREATE INDEX privacy_requests_queue_idx ON privacy_requests (state, requested_at);
