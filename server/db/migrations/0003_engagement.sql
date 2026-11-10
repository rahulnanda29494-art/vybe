-- 0003_engagement — views, likes, comments, subscriptions, library, signals.
--
-- The counters on videos/channels are caches. These tables are the record,
-- and a reconciliation job can always rebuild the caches from them.

-- ----------------------------------------------------------------- views
-- Append-only fact table. A playback start is NOT a view: the worker/API
-- promotes a row to counted once watch time passes the threshold, and the
-- (video, viewer, hour) unique index does the deduplication.
CREATE TABLE video_views (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id        uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES users(id) ON DELETE SET NULL,   -- null = signed out
  session_hash    text NOT NULL,                 -- hashed session id, never raw
  watched_seconds numeric(10,3) NOT NULL DEFAULT 0 CHECK (watched_seconds >= 0),
  completion      numeric(5,4) NOT NULL DEFAULT 0 CHECK (completion BETWEEN 0 AND 1),
  counted         boolean NOT NULL DEFAULT false,   -- passed validation
  monetizable     boolean NOT NULL DEFAULT false,   -- passed stricter ad rules
  country         char(2),
  device          text CHECK (device IN ('desktop', 'mobile', 'tablet', 'tv', 'other')),
  traffic_source  text,                             -- 'search', 'home', 'channel', 'external'
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  -- Hour bucket the dedupe index keys on. Pinned to UTC because date_trunc
  -- over a timestamptz reads the session TimeZone, which a generated column
  -- may not do.
  hour_bucket     timestamp GENERATED ALWAYS AS (date_trunc('hour', started_at AT TIME ZONE 'UTC')) STORED
);
CREATE UNIQUE INDEX video_views_dedupe_idx
  ON video_views (video_id, session_hash, hour_bucket);
CREATE INDEX video_views_video_idx ON video_views (video_id, started_at DESC);
CREATE INDEX video_views_user_idx  ON video_views (user_id, started_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX video_views_counted_idx ON video_views (started_at) WHERE counted;

-- Resume-watching state: one row per viewer per video.
CREATE TABLE watch_history (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id    uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  position_s  numeric(10,3) NOT NULL DEFAULT 0 CHECK (position_s >= 0),
  duration_s  numeric(10,3) NOT NULL DEFAULT 0,
  completed   boolean NOT NULL DEFAULT false,
  watched_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
CREATE INDEX watch_history_recent_idx ON watch_history (user_id, watched_at DESC);

-- ----------------------------------------------------------------- likes
CREATE TABLE video_likes (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id    uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  value       smallint NOT NULL CHECK (value IN (-1, 1)),   -- dislike / like
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
CREATE INDEX video_likes_video_idx ON video_likes (video_id) WHERE value = 1;

-- videos.like_count / dislike_count follow the table automatically.
CREATE OR REPLACE FUNCTION video_likes_count_trigger() RETURNS trigger AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    UPDATE videos SET
      like_count    = GREATEST(like_count    - (CASE WHEN OLD.value =  1 THEN 1 ELSE 0 END), 0),
      dislike_count = GREATEST(dislike_count - (CASE WHEN OLD.value = -1 THEN 1 ELSE 0 END), 0)
      WHERE id = OLD.video_id;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE videos SET
      like_count    = like_count    + (CASE WHEN NEW.value =  1 THEN 1 ELSE 0 END),
      dislike_count = dislike_count + (CASE WHEN NEW.value = -1 THEN 1 ELSE 0 END)
      WHERE id = NEW.video_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_likes_counts
  AFTER INSERT OR UPDATE OR DELETE ON video_likes
  FOR EACH ROW EXECUTE FUNCTION video_likes_count_trigger();

-- -------------------------------------------------------------- comments
CREATE TYPE comment_status AS ENUM ('visible', 'held', 'removed', 'spam');

CREATE TABLE comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id     uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id    uuid REFERENCES comments(id) ON DELETE CASCADE,
  body         text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  status       comment_status NOT NULL DEFAULT 'visible',
  pinned       boolean NOT NULL DEFAULT false,
  hearted      boolean NOT NULL DEFAULT false,      -- creator heart
  like_count   integer NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  reply_count  integer NOT NULL DEFAULT 0 CHECK (reply_count >= 0),
  edited_at    timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);
CREATE INDEX comments_thread_idx ON comments (video_id, parent_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX comments_top_idx    ON comments (video_id, like_count DESC)
  WHERE parent_id IS NULL AND status = 'visible' AND deleted_at IS NULL;
CREATE INDEX comments_user_idx   ON comments (user_id, created_at DESC);
CREATE TRIGGER comments_touch BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE comment_likes (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id  uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);

CREATE OR REPLACE FUNCTION comments_count_trigger() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE videos SET comment_count = comment_count + 1 WHERE id = NEW.video_id;
    IF NEW.parent_id IS NOT NULL THEN
      UPDATE comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE videos SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.video_id;
    IF OLD.parent_id IS NOT NULL THEN
      UPDATE comments SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.parent_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_counts
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION comments_count_trigger();

CREATE OR REPLACE FUNCTION comment_likes_count_trigger() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSE
    UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_likes_counts
  AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW EXECUTE FUNCTION comment_likes_count_trigger();

-- --------------------------------------------------------------- social
CREATE TABLE channel_subscriptions (
  subscriber_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id    uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  notify        text NOT NULL DEFAULT 'personalised'
                  CHECK (notify IN ('all', 'personalised', 'none')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subscriber_id, channel_id)
);
CREATE INDEX channel_subscriptions_channel_idx ON channel_subscriptions (channel_id, created_at DESC);

CREATE OR REPLACE FUNCTION channel_subs_count_trigger() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE channels SET subscriber_count = subscriber_count + 1 WHERE id = NEW.channel_id;
  ELSE
    UPDATE channels SET subscriber_count = GREATEST(subscriber_count - 1, 0) WHERE id = OLD.channel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER channel_subscriptions_counts
  AFTER INSERT OR DELETE ON channel_subscriptions
  FOR EACH ROW EXECUTE FUNCTION channel_subs_count_trigger();

CREATE TABLE blocks (
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason        text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, blocked_id),
  CONSTRAINT blocks_not_self CHECK (user_id <> blocked_id)
);

CREATE TABLE shares (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id    uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  destination text NOT NULL,                -- 'copy_link', 'whatsapp', 'x', 'embed'
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shares_video_idx ON shares (video_id, created_at DESC);

-- --------------------------------------------------------- notifications
CREATE TYPE notification_kind AS ENUM (
  'new_video', 'new_short', 'live_started', 'comment_reply',
  'comment_on_video', 'new_subscriber', 'video_ready', 'video_failed',
  'moderation', 'payout', 'system'
);

CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        notification_kind NOT NULL,
  title       text NOT NULL,
  body        text NOT NULL DEFAULT '',
  href        text,                          -- where clicking it goes
  actor_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  video_id    uuid REFERENCES videos(id) ON DELETE CASCADE,
  channel_id  uuid REFERENCES channels(id) ON DELETE CASCADE,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_inbox_idx ON notifications (user_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON notifications (user_id) WHERE read_at IS NULL;

-- -------------------------------------------------------------- library
CREATE TYPE playlist_visibility AS ENUM ('public', 'unlisted', 'private');

CREATE TABLE playlists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description  text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  visibility   playlist_visibility NOT NULL DEFAULT 'private',
  -- Built-in lists every account gets; one of each per user.
  system_kind  text CHECK (system_kind IN ('watch_later', 'liked')),
  item_count   integer NOT NULL DEFAULT 0 CHECK (item_count >= 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX playlists_system_idx ON playlists (owner_id, system_kind)
  WHERE system_kind IS NOT NULL;
CREATE INDEX playlists_owner_idx ON playlists (owner_id, updated_at DESC);
CREATE TRIGGER playlists_touch BEFORE UPDATE ON playlists
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE playlist_videos (
  playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id    uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  position    integer NOT NULL,
  added_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (playlist_id, video_id)
);
CREATE UNIQUE INDEX playlist_videos_order_idx ON playlist_videos (playlist_id, position);

CREATE OR REPLACE FUNCTION playlist_count_trigger() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE playlists SET item_count = item_count + 1 WHERE id = NEW.playlist_id;
  ELSE
    UPDATE playlists SET item_count = GREATEST(item_count - 1, 0) WHERE id = OLD.playlist_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER playlist_videos_counts
  AFTER INSERT OR DELETE ON playlist_videos
  FOR EACH ROW EXECUTE FUNCTION playlist_count_trigger();

-- ------------------------------------------------------ discovery signal
CREATE TABLE search_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  query       text NOT NULL CHECK (char_length(query) BETWEEN 1 AND 200),
  results     integer NOT NULL DEFAULT 0,
  clicked_video_id uuid REFERENCES videos(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX search_history_user_idx ON search_history (user_id, created_at DESC);

-- Impressions and negative feedback that train the ranker later.
CREATE TABLE recommendation_events (
  id          bigserial PRIMARY KEY,
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  video_id    uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  surface     text NOT NULL,                 -- 'home', 'watch_next', 'shorts', 'search'
  action      text NOT NULL CHECK (action IN ('impression', 'click', 'skip', 'not_interested', 'hide_channel')),
  position    integer,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX recommendation_events_video_idx ON recommendation_events (video_id, created_at DESC);
CREATE INDEX recommendation_events_user_idx  ON recommendation_events (user_id, created_at DESC);

-- Rolling trend score, recomputed by a scheduled job.
CREATE TABLE trending_scores (
  video_id      uuid PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
  score         numeric(12,4) NOT NULL DEFAULT 0,
  views_24h     bigint NOT NULL DEFAULT 0,
  likes_24h     bigint NOT NULL DEFAULT 0,
  comments_24h  bigint NOT NULL DEFAULT 0,
  velocity      numeric(12,4) NOT NULL DEFAULT 0,
  region        char(2),
  computed_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trending_scores_rank_idx ON trending_scores (region, score DESC);

-- ------------------------------------------------------- community posts
CREATE TABLE community_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  image_key   text,
  poll        jsonb,                         -- {question, options[], votes[]}
  like_count  integer NOT NULL DEFAULT 0,
  visibility  video_visibility NOT NULL DEFAULT 'public',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);
CREATE INDEX community_posts_channel_idx ON community_posts (channel_id, created_at DESC);
CREATE TRIGGER community_posts_touch BEFORE UPDATE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
