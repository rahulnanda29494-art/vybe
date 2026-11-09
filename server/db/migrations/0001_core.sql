-- 0001_core — identity, access control, channels, platform settings.
--
-- Conventions used by every migration in this folder:
--   * uuid primary keys (gen_random_uuid) so ids can be minted client-side
--     and are safe to expose in URLs;
--   * created_at / updated_at on every mutable table, updated_at maintained
--     by the touch_updated_at() trigger rather than by application code;
--   * deleted_at where a row must survive deletion for moderation or audit;
--   * every foreign key states its ON DELETE behaviour explicitly.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Keeps updated_at honest no matter which code path writes the row.
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------ users
CREATE TYPE user_role   AS ENUM ('viewer', 'creator', 'moderator', 'admin', 'superadmin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deactivated', 'banned');

CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             citext UNIQUE NOT NULL CHECK (position('@' IN email) > 1),
  password_hash     text,                      -- null for OAuth-only accounts
  display_name      text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 60),
  role              user_role   NOT NULL DEFAULT 'viewer',
  status            user_status NOT NULL DEFAULT 'active',
  email_verified_at timestamptz,
  last_seen_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);
CREATE INDEX users_role_idx   ON users (role) WHERE deleted_at IS NULL;
CREATE INDEX users_status_idx ON users (status) WHERE status <> 'active';
CREATE TRIGGER users_touch BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE user_profiles (
  user_id      uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  avatar_key   text,
  country      char(2),
  locale       text NOT NULL DEFAULT 'en',
  birth_year   smallint CHECK (birth_year BETWEEN 1900 AND 2100),
  bio          text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 500),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER user_profiles_touch BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- One row per user; every preference the settings screen writes lives here.
CREATE TABLE user_settings (
  user_id             uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme               text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
  autoplay            boolean NOT NULL DEFAULT true,
  restricted_mode     boolean NOT NULL DEFAULT false,
  default_quality     text NOT NULL DEFAULT 'auto',
  pause_history       boolean NOT NULL DEFAULT false,
  email_notifications boolean NOT NULL DEFAULT true,
  push_notifications  boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER user_settings_touch BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Federated sign-in (Google and anything added later).
CREATE TABLE user_identities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider     text NOT NULL CHECK (provider IN ('google', 'apple', 'github')),
  subject      text NOT NULL,                 -- provider's stable user id
  email        citext,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, subject)
);

-- Short-lived access tokens are stateless; refresh tokens are stored hashed
-- so a stolen database row cannot be replayed and sessions can be revoked.
CREATE TABLE refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  user_agent  text,
  ip_hash     text,                           -- hashed: we never store raw IPs
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id) WHERE revoked_at IS NULL;

-- One-time tokens: email verification and password reset.
CREATE TYPE token_purpose AS ENUM ('email_verify', 'password_reset');

CREATE TABLE auth_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     token_purpose NOT NULL,
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_tokens_user_idx ON auth_tokens (user_id, purpose) WHERE used_at IS NULL;

-- ------------------------------------------------------- roles and grants
-- users.role covers the common case; this table carries the fine-grained
-- grants the admin panel edits (e.g. a moderator who may also manage ads).
CREATE TABLE permissions (
  code        text PRIMARY KEY,              -- 'videos.moderate', 'payouts.approve'
  description text NOT NULL
);

CREATE TABLE role_permissions (
  role        user_role NOT NULL,
  permission  text NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role, permission)
);

CREATE TABLE user_permissions (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission  text NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  granted_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission)
);

-- --------------------------------------------------------------- channels
CREATE TABLE channels (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  handle           citext UNIQUE NOT NULL CHECK (handle ~ '^[a-z0-9_.]{3,30}$'),
  name             text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  bio              text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 1000),
  category         text NOT NULL DEFAULT 'general',
  country          char(2),
  verified         boolean NOT NULL DEFAULT false,
  avatar_key       text,                      -- storage keys, never URLs
  cover_key        text,
  links            jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Denormalised counters, maintained by triggers in later migrations.
  subscriber_count bigint NOT NULL DEFAULT 0 CHECK (subscriber_count >= 0),
  video_count      integer NOT NULL DEFAULT 0 CHECK (video_count >= 0),
  total_views      bigint NOT NULL DEFAULT 0 CHECK (total_views >= 0),
  monetization     text NOT NULL DEFAULT 'ineligible'
                     CHECK (monetization IN ('ineligible', 'pending', 'approved', 'suspended')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);
CREATE INDEX channels_name_trgm_idx ON channels USING gin (name gin_trgm_ops);
CREATE INDEX channels_popular_idx   ON channels (subscriber_count DESC) WHERE deleted_at IS NULL;
CREATE TRIGGER channels_touch BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ------------------------------------------------------- platform config
-- Editable from the admin panel; read through a short-lived cache.
CREATE TABLE platform_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  description text NOT NULL DEFAULT '',
  updated_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
