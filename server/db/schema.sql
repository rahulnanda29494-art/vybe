-- VYBE — PostgreSQL schema
-- Apply with:  psql "$DATABASE_URL" -f server/db/schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------- users
CREATE TABLE IF NOT EXISTS users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          citext UNIQUE NOT NULL,
  password_hash  text NOT NULL,             -- scrypt: salt:hash (hex)
  display_name   text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- A user may own one channel (creator profile).
CREATE TABLE IF NOT EXISTS channels (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  handle         citext UNIQUE NOT NULL CHECK (handle ~ '^[a-z0-9_.]{3,30}$'),
  name           text NOT NULL,
  bio            text NOT NULL DEFAULT '',
  category       text NOT NULL,
  verified       boolean NOT NULL DEFAULT false,
  avatar_key     text,                      -- object-storage keys, never URLs
  cover_key      text,
  links          jsonb NOT NULL DEFAULT '[]',
  follower_count bigint NOT NULL DEFAULT 0, -- denormalised, maintained by trigger/job
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- content
CREATE TYPE video_kind       AS ENUM ('video', 'short', 'live');
CREATE TYPE video_visibility AS ENUM ('public', 'unlisted', 'private');
CREATE TYPE video_status     AS ENUM ('uploading', 'processing', 'ready', 'failed');

CREATE TABLE IF NOT EXISTS videos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id      uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  kind            video_kind NOT NULL DEFAULT 'video',
  title           text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  description     text NOT NULL DEFAULT '' CHECK (char_length(description) <= 5000),
  category        text NOT NULL,
  tags            text[] NOT NULL DEFAULT '{}',
  duration_s      integer NOT NULL DEFAULT 0,
  source_key      text,                     -- original upload
  thumbnail_key   text,
  status          video_status NOT NULL DEFAULT 'uploading',
  visibility      video_visibility NOT NULL DEFAULT 'private',
  made_for_kids   boolean NOT NULL DEFAULT false,
  publish_at      timestamptz,              -- null = on processing complete
  view_count      bigint NOT NULL DEFAULT 0,
  like_count      bigint NOT NULL DEFAULT 0,
  comment_count   bigint NOT NULL DEFAULT 0,
  search          tsvector GENERATED ALWAYS AS (
                    setweight(to_tsvector('simple', title), 'A') ||
                    setweight(to_tsvector('simple', array_to_string(tags, ' ')), 'B') ||
                    setweight(to_tsvector('simple', description), 'C')
                  ) STORED,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS videos_feed_idx    ON videos (visibility, status, publish_at DESC);
CREATE INDEX IF NOT EXISTS videos_channel_idx ON videos (channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS videos_search_idx  ON videos USING gin (search);

-- ---------------------------------------------------------------- social
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id  uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  notify      boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);

CREATE TABLE IF NOT EXISTS reactions (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id    uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  value       smallint NOT NULL CHECK (value IN (-1, 1)),   -- dislike / like
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id    uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES comments(id) ON DELETE CASCADE,  -- one level of replies
  body        text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  pinned      boolean NOT NULL DEFAULT false,
  like_count  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_video_idx ON comments (video_id, parent_id, created_at DESC);

-- ---------------------------------------------------------------- library
CREATE TABLE IF NOT EXISTS watch_history (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id    uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  position_s  integer NOT NULL DEFAULT 0,
  watched_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
CREATE INDEX IF NOT EXISTS history_recent_idx ON watch_history (user_id, watched_at DESC);

CREATE TABLE IF NOT EXISTS playlists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  visibility  video_visibility NOT NULL DEFAULT 'private',
  system_kind text CHECK (system_kind IN ('watch_later', 'liked')),  -- built-in lists
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, system_kind)
);

CREATE TABLE IF NOT EXISTS playlist_items (
  playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id    uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  position    integer NOT NULL,
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (playlist_id, video_id)
);

-- ---------------------------------------------------------------- sessions
-- JWTs are short-lived; refresh tokens are stored hashed so they can be revoked.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
