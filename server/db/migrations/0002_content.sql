-- 0002_content — categories, videos, media assets, upload and processing.
--
-- Separation the blueprint asks for: `videos` holds metadata only, every
-- binary lives in object storage and is described by a row in video_assets
-- (one file) or video_variants (one ABR rendition). PostgreSQL never stores
-- media bytes.

-- -------------------------------------------------------------- taxonomy
CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]{2,40}$'),
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon        text,                          -- lucide icon name used by the UI
  position    integer NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER categories_touch BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ------------------------------------------------------- channel members
-- Lets a creator share Studio access without sharing the account.
CREATE TYPE channel_role AS ENUM ('owner', 'manager', 'editor', 'viewer');

CREATE TABLE channel_members (
  channel_id  uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        channel_role NOT NULL DEFAULT 'editor',
  invited_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);
CREATE INDEX channel_members_user_idx ON channel_members (user_id);

-- ---------------------------------------------------------------- videos
CREATE TYPE video_type       AS ENUM ('long', 'short', 'live');
CREATE TYPE video_visibility AS ENUM ('public', 'unlisted', 'private');
CREATE TYPE video_status     AS ENUM (
  'draft',        -- metadata created, no file yet
  'uploading',    -- upload session open
  'queued',       -- file complete, waiting for a worker
  'processing',   -- FFmpeg running
  'ready',        -- renditions published
  'failed',       -- processing gave up
  'blocked'       -- removed by moderation
);

CREATE TABLE videos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id        uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  created_by        uuid REFERENCES users(id) ON DELETE SET NULL,
  type              video_type       NOT NULL DEFAULT 'long',
  title             text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description       text NOT NULL DEFAULT '' CHECK (char_length(description) <= 5000),
  category_id       uuid REFERENCES categories(id) ON DELETE SET NULL,
  language          text NOT NULL DEFAULT 'en',
  duration_seconds  numeric(10,3) NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  visibility        video_visibility NOT NULL DEFAULT 'private',
  status            video_status     NOT NULL DEFAULT 'draft',
  made_for_kids     boolean NOT NULL DEFAULT false,
  age_restricted    boolean NOT NULL DEFAULT false,
  comments_enabled  boolean NOT NULL DEFAULT true,
  -- null = publish as soon as processing finishes; future = scheduled.
  scheduled_at      timestamptz,
  published_at      timestamptz,
  -- Denormalised counters; the source of truth is the event tables.
  view_count        bigint  NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  like_count        bigint  NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  dislike_count     bigint  NOT NULL DEFAULT 0 CHECK (dislike_count >= 0),
  comment_count     bigint  NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
  -- Set when the catalogue row mirrors a YouTube video instead of an upload.
  external_source   text CHECK (external_source IN ('youtube')),
  external_id       text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  CONSTRAINT videos_external_pair CHECK (
    (external_source IS NULL AND external_id IS NULL) OR
    (external_source IS NOT NULL AND external_id IS NOT NULL)
  ),
  CONSTRAINT videos_published_when_ready CHECK (
    published_at IS NULL OR status IN ('ready', 'blocked')
  )
);
CREATE UNIQUE INDEX videos_external_idx ON videos (external_source, external_id)
  WHERE external_source IS NOT NULL;
-- The home/explore feed query: public + ready, newest first.
CREATE INDEX videos_feed_idx     ON videos (published_at DESC)
  WHERE visibility = 'public' AND status = 'ready' AND deleted_at IS NULL;
CREATE INDEX videos_channel_idx  ON videos (channel_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX videos_category_idx ON videos (category_id, published_at DESC)
  WHERE visibility = 'public' AND status = 'ready';
CREATE INDEX videos_type_idx     ON videos (type, published_at DESC)
  WHERE visibility = 'public' AND status = 'ready';
-- Worker pick-up and the Studio "processing" list.
CREATE INDEX videos_status_idx   ON videos (status) WHERE status <> 'ready';
CREATE TRIGGER videos_touch BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Full-text search vector, maintained by trigger because it also folds in
-- the channel name and tag list, which generated columns cannot reach.
ALTER TABLE videos ADD COLUMN search tsvector;
CREATE INDEX videos_search_idx ON videos USING gin (search);
CREATE INDEX videos_title_trgm_idx ON videos USING gin (title gin_trgm_ops);

CREATE TABLE video_tags (
  video_id  uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  tag       citext NOT NULL CHECK (char_length(tag) BETWEEN 1 AND 40),
  PRIMARY KEY (video_id, tag)
);
CREATE INDEX video_tags_tag_idx ON video_tags (tag);

CREATE OR REPLACE FUNCTION videos_refresh_search(v_id uuid) RETURNS void AS $$
  UPDATE videos v SET search =
      setweight(to_tsvector('simple', coalesce(v.title, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce((
        SELECT string_agg(t.tag::text, ' ') FROM video_tags t WHERE t.video_id = v.id
      ), '')), 'B') ||
      setweight(to_tsvector('simple', coalesce((
        SELECT c.name FROM channels c WHERE c.id = v.channel_id
      ), '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(v.description, '')), 'C')
    WHERE v.id = v_id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION videos_search_trigger() RETURNS trigger AS $$
BEGIN
  PERFORM videos_refresh_search(NEW.id);
  RETURN NULL;                    -- AFTER trigger: the UPDATE above does the work
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER videos_search_sync
  AFTER INSERT OR UPDATE OF title, description, channel_id ON videos
  FOR EACH ROW EXECUTE FUNCTION videos_search_trigger();

CREATE OR REPLACE FUNCTION video_tags_search_trigger() RETURNS trigger AS $$
BEGIN
  PERFORM videos_refresh_search(COALESCE(NEW.video_id, OLD.video_id));
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_tags_search_sync
  AFTER INSERT OR DELETE ON video_tags
  FOR EACH ROW EXECUTE FUNCTION video_tags_search_trigger();

-- Keep channels.video_count in step with published uploads.
CREATE OR REPLACE FUNCTION channels_video_count_trigger() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE channels SET video_count = video_count + 1 WHERE id = NEW.channel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE channels SET video_count = GREATEST(video_count - 1, 0) WHERE id = OLD.channel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER videos_channel_count
  AFTER INSERT OR DELETE ON videos
  FOR EACH ROW EXECUTE FUNCTION channels_video_count_trigger();

-- ----------------------------------------------------------- media files
CREATE TYPE asset_type AS ENUM (
  'original',       -- the creator's upload, kept for re-transcoding
  'thumbnail',      -- poster image
  'preview',        -- short animated hover preview
  'hls_master',     -- master .m3u8
  'storyboard',     -- seek-bar sprite sheet
  'subtitle',
  'audio'
);

CREATE TABLE video_assets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id     uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  asset_type   asset_type NOT NULL,
  storage_key  text NOT NULL,                -- key in object storage, never a URL
  mime_type    text NOT NULL,
  size_bytes   bigint NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  width        integer CHECK (width  IS NULL OR width  > 0),
  height       integer CHECK (height IS NULL OR height > 0),
  checksum     text,                         -- sha256 of the stored object
  language     text,                         -- subtitle/audio track language
  is_primary   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_id, storage_key)
);
CREATE INDEX video_assets_lookup_idx ON video_assets (video_id, asset_type);
-- At most one primary asset of a given type per video (the live thumbnail).
CREATE UNIQUE INDEX video_assets_primary_idx ON video_assets (video_id, asset_type)
  WHERE is_primary;

-- One row per ABR rendition produced by FFmpeg.
CREATE TABLE video_variants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id      uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  label         text NOT NULL,               -- '1080p', '720p', '480p', '360p'
  width         integer NOT NULL CHECK (width  > 0),
  height        integer NOT NULL CHECK (height > 0),
  bitrate_kbps  integer NOT NULL CHECK (bitrate_kbps > 0),
  framerate     numeric(5,2),
  codec         text NOT NULL DEFAULT 'h264',
  playlist_key  text NOT NULL,               -- rendition .m3u8
  size_bytes    bigint NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_id, label)
);
CREATE INDEX video_variants_video_idx ON video_variants (video_id, height DESC);

CREATE TABLE subtitles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id     uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  language     text NOT NULL,
  label        text NOT NULL,
  storage_key  text NOT NULL,                -- .vtt in object storage
  source       text NOT NULL DEFAULT 'uploaded' CHECK (source IN ('uploaded', 'auto', 'translated')),
  is_default   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_id, language, source)
);

CREATE TABLE video_chapters (
  video_id    uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  start_s     integer NOT NULL CHECK (start_s >= 0),
  title       text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  source      text NOT NULL DEFAULT 'description' CHECK (source IN ('description', 'manual', 'ai')),
  PRIMARY KEY (video_id, start_s)
);

-- -------------------------------------------------------------- uploads
-- A resumable multipart upload. Parts go straight to storage; this row
-- tracks progress so an interrupted upload can be resumed or cleaned up.
CREATE TYPE upload_status AS ENUM ('open', 'completed', 'aborted', 'expired');

CREATE TABLE upload_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id     uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  video_id       uuid REFERENCES videos(id) ON DELETE SET NULL,
  storage_key    text NOT NULL,
  provider_id    text,                       -- S3 multipart UploadId
  filename       text NOT NULL,
  mime_type      text NOT NULL,
  size_bytes     bigint NOT NULL CHECK (size_bytes > 0),
  part_size      integer NOT NULL DEFAULT 8388608,
  parts_total    integer NOT NULL DEFAULT 1,
  parts_received integer NOT NULL DEFAULT 0 CHECK (parts_received >= 0),
  checksum       text,
  status         upload_status NOT NULL DEFAULT 'open',
  error          text,
  expires_at     timestamptz NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT upload_parts_sane CHECK (parts_received <= parts_total)
);
CREATE INDEX upload_sessions_user_idx ON upload_sessions (user_id, created_at DESC);
CREATE INDEX upload_sessions_open_idx ON upload_sessions (expires_at) WHERE status = 'open';
CREATE TRIGGER upload_sessions_touch BEFORE UPDATE ON upload_sessions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE upload_parts (
  session_id  uuid NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  part_number integer NOT NULL CHECK (part_number > 0),
  size_bytes  bigint NOT NULL CHECK (size_bytes > 0),
  etag        text,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, part_number)
);

-- ------------------------------------------------------- processing jobs
-- A PostgreSQL-backed queue (FOR UPDATE SKIP LOCKED). The job contract is
-- deliberately the same shape BullMQ uses, so moving to Redis later is a
-- driver swap rather than a redesign — see docs/DECISIONS.md.
CREATE TYPE job_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');

CREATE TABLE processing_jobs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind           text NOT NULL,              -- 'transcode', 'thumbnail', 'subtitles', 'preview'
  video_id       uuid REFERENCES videos(id) ON DELETE CASCADE,
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  status         job_status NOT NULL DEFAULT 'queued',
  priority       smallint NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 9),
  progress       smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  attempts       smallint NOT NULL DEFAULT 0,
  max_attempts   smallint NOT NULL DEFAULT 3,
  run_after      timestamptz NOT NULL DEFAULT now(),   -- backoff / scheduling
  locked_by      text,                                 -- worker id holding the lease
  locked_until   timestamptz,                          -- lease expiry: crash recovery
  idempotency_key text UNIQUE,
  error          text,
  started_at     timestamptz,
  finished_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
-- The claim query: queued (or an expired lease), due now, best priority first.
CREATE INDEX processing_jobs_claim_idx ON processing_jobs (status, priority, run_after)
  WHERE status IN ('queued', 'running');
CREATE INDEX processing_jobs_video_idx ON processing_jobs (video_id, created_at DESC);
CREATE TRIGGER processing_jobs_touch BEFORE UPDATE ON processing_jobs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
