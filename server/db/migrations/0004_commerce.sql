-- 0004_commerce — advertising, memberships, payments and a double-entry ledger.
--
-- Money rules this schema enforces rather than trusts:
--   * amounts are integer minor units (paise/cents) — never floats;
--   * every posted transaction must balance to zero (deferred trigger);
--   * ledger rows are immutable — corrections are reversing entries;
--   * every external money movement carries an idempotency key.

-- -------------------------------------------------- monetization status
CREATE TYPE monetization_status AS ENUM ('ineligible', 'pending', 'approved', 'suspended', 'rejected');

CREATE TABLE monetization_accounts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id        uuid NOT NULL UNIQUE REFERENCES channels(id) ON DELETE CASCADE,
  status            monetization_status NOT NULL DEFAULT 'ineligible',
  currency          char(3) NOT NULL DEFAULT 'INR',
  revenue_share_bps integer NOT NULL DEFAULT 5500 CHECK (revenue_share_bps BETWEEN 0 AND 10000),
  -- Compliance, all optional until the creator applies.
  legal_name        text,
  tax_country       char(2),
  tax_id_hash       text,                    -- hashed PAN/GSTIN, never raw
  kyc_status        text NOT NULL DEFAULT 'none'
                      CHECK (kyc_status IN ('none', 'submitted', 'verified', 'rejected')),
  kyc_verified_at   timestamptz,
  payout_method     text CHECK (payout_method IN ('bank', 'upi', 'paypal')),
  payout_details    jsonb,                   -- tokenised reference from the provider
  applied_at        timestamptz,
  reviewed_at       timestamptz,
  reviewed_by       uuid REFERENCES users(id) ON DELETE SET NULL,
  notes             text NOT NULL DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER monetization_accounts_touch BEFORE UPDATE ON monetization_accounts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ----------------------------------------------------------- advertising
CREATE TYPE campaign_status AS ENUM ('draft', 'pending_review', 'active', 'paused', 'completed', 'rejected');
CREATE TYPE ad_format       AS ENUM ('preroll', 'midroll', 'postroll', 'display', 'sponsored_card');

CREATE TABLE ad_campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  name            text NOT NULL,
  status          campaign_status NOT NULL DEFAULT 'draft',
  currency        char(3) NOT NULL DEFAULT 'INR',
  budget_minor    bigint NOT NULL CHECK (budget_minor >= 0),
  spent_minor     bigint NOT NULL DEFAULT 0 CHECK (spent_minor >= 0),
  bid_cpm_minor   bigint NOT NULL DEFAULT 0 CHECK (bid_cpm_minor >= 0),
  targeting       jsonb NOT NULL DEFAULT '{}'::jsonb,   -- countries, categories, devices
  starts_at       timestamptz,
  ends_at         timestamptz,
  reviewed_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ad_campaigns_window CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
  CONSTRAINT ad_campaigns_budget CHECK (spent_minor <= budget_minor)
);
CREATE INDEX ad_campaigns_active_idx ON ad_campaigns (status, starts_at, ends_at) WHERE status = 'active';
CREATE TRIGGER ad_campaigns_touch BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE advertisements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    uuid NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  format         ad_format NOT NULL,
  headline       text NOT NULL,
  body           text NOT NULL DEFAULT '',
  media_key      text,                      -- creative in object storage
  click_url      text NOT NULL,
  skip_after_s   smallint CHECK (skip_after_s IS NULL OR skip_after_s BETWEEN 0 AND 30),
  duration_s     smallint,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX advertisements_campaign_idx ON advertisements (campaign_id) WHERE active;
CREATE TRIGGER advertisements_touch BEFORE UPDATE ON advertisements
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- High-volume fact table; partition by month once volume justifies it.
CREATE TABLE ad_impressions (
  id             bigserial PRIMARY KEY,
  advertisement_id uuid NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
  campaign_id    uuid NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  video_id       uuid REFERENCES videos(id) ON DELETE SET NULL,
  channel_id     uuid REFERENCES channels(id) ON DELETE SET NULL,
  user_id        uuid REFERENCES users(id) ON DELETE SET NULL,
  session_hash   text NOT NULL,
  watched_s      numeric(6,2) NOT NULL DEFAULT 0,
  completed      boolean NOT NULL DEFAULT false,
  clicked        boolean NOT NULL DEFAULT false,
  billable       boolean NOT NULL DEFAULT false,
  revenue_minor  bigint NOT NULL DEFAULT 0 CHECK (revenue_minor >= 0),
  country        char(2),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ad_impressions_campaign_idx ON ad_impressions (campaign_id, created_at DESC);
CREATE INDEX ad_impressions_channel_idx  ON ad_impressions (channel_id, created_at DESC) WHERE billable;

-- ----------------------------------------------------------- memberships
CREATE TABLE membership_tiers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id    uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  price_minor   bigint NOT NULL CHECK (price_minor > 0),
  currency      char(3) NOT NULL DEFAULT 'INR',
  perks         jsonb NOT NULL DEFAULT '[]'::jsonb,
  badge_key     text,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, name)
);
CREATE TRIGGER membership_tiers_touch BEFORE UPDATE ON membership_tiers
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TYPE subscription_state AS ENUM ('active', 'past_due', 'cancelled', 'expired');

CREATE TABLE memberships (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier_id           uuid NOT NULL REFERENCES membership_tiers(id) ON DELETE RESTRICT,
  channel_id        uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  state             subscription_state NOT NULL DEFAULT 'active',
  provider          text NOT NULL DEFAULT 'manual',
  provider_ref      text,
  current_period_end timestamptz,
  cancelled_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX memberships_one_active_idx ON memberships (user_id, channel_id)
  WHERE state = 'active';
CREATE TRIGGER memberships_touch BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Platform-wide premium (ad-free) plans.
CREATE TABLE premium_plans (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text UNIQUE NOT NULL,
  name         text NOT NULL,
  price_minor  bigint NOT NULL CHECK (price_minor >= 0),
  currency     char(3) NOT NULL DEFAULT 'INR',
  interval     text NOT NULL DEFAULT 'month' CHECK (interval IN ('month', 'year')),
  features     jsonb NOT NULL DEFAULT '[]'::jsonb,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE premium_subscriptions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id            uuid NOT NULL REFERENCES premium_plans(id) ON DELETE RESTRICT,
  state              subscription_state NOT NULL DEFAULT 'active',
  provider           text NOT NULL DEFAULT 'manual',
  provider_ref       text,
  current_period_end timestamptz,
  cancelled_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX premium_one_active_idx ON premium_subscriptions (user_id) WHERE state = 'active';
CREATE TRIGGER premium_subscriptions_touch BEFORE UPDATE ON premium_subscriptions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- -------------------------------------------------------------- payments
CREATE TYPE payment_state AS ENUM ('created', 'pending', 'succeeded', 'failed', 'refunded', 'disputed');

CREATE TABLE payment_transactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES users(id) ON DELETE SET NULL,
  purpose          text NOT NULL CHECK (purpose IN ('membership', 'premium', 'paid_video', 'gift', 'ad_topup')),
  reference_id     uuid,                     -- membership/premium/video id
  provider         text NOT NULL,            -- 'razorpay', 'stripe', 'manual'
  provider_ref     text,                     -- provider payment id
  idempotency_key  text UNIQUE NOT NULL,
  state            payment_state NOT NULL DEFAULT 'created',
  amount_minor     bigint NOT NULL CHECK (amount_minor >= 0),
  fee_minor        bigint NOT NULL DEFAULT 0 CHECK (fee_minor >= 0),
  tax_minor        bigint NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
  currency         char(3) NOT NULL DEFAULT 'INR',
  failure_reason   text,
  -- Raw webhook payloads, kept for reconciliation and dispute evidence.
  provider_events  jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_transactions_user_idx ON payment_transactions (user_id, created_at DESC);
CREATE UNIQUE INDEX payment_transactions_provider_idx ON payment_transactions (provider, provider_ref)
  WHERE provider_ref IS NOT NULL;
CREATE TRIGGER payment_transactions_touch BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Webhook de-duplication: a provider may deliver the same event many times.
CREATE TABLE webhook_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      text NOT NULL,
  event_id      text NOT NULL,
  signature_ok  boolean NOT NULL,
  payload       jsonb NOT NULL,
  processed_at  timestamptz,
  error         text,
  received_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

-- ---------------------------------------------------------------- ledger
CREATE TYPE account_kind  AS ENUM ('asset', 'liability', 'revenue', 'expense', 'equity');
CREATE TYPE entry_side    AS ENUM ('debit', 'credit');

CREATE TABLE ledger_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,          -- 'platform.revenue.ads', 'channel.payable'
  kind        account_kind NOT NULL,
  owner_type  text NOT NULL DEFAULT 'platform' CHECK (owner_type IN ('platform', 'channel', 'user', 'provider')),
  owner_id    uuid,                          -- channel/user id when owner_type is not platform
  currency    char(3) NOT NULL DEFAULT 'INR',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_type, owner_id, code)
);

CREATE TABLE ledger_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL,             -- 'ad_revenue', 'membership', 'payout', 'reversal'
  description     text NOT NULL DEFAULT '',
  idempotency_key text UNIQUE NOT NULL,
  reverses_id     uuid REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
  payment_id      uuid REFERENCES payment_transactions(id) ON DELETE SET NULL,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_transactions_kind_idx ON ledger_transactions (kind, occurred_at DESC);

CREATE TABLE ledger_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  uuid NOT NULL REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
  account_id      uuid NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  side            entry_side NOT NULL,
  amount_minor    bigint NOT NULL CHECK (amount_minor > 0),
  currency        char(3) NOT NULL DEFAULT 'INR',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_entries_account_idx ON ledger_entries (account_id, created_at DESC);
CREATE INDEX ledger_entries_txn_idx     ON ledger_entries (transaction_id);

-- Posted entries never change. Corrections post a reversing transaction.
CREATE OR REPLACE FUNCTION ledger_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger entries are immutable: post a reversing transaction instead';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_immutable
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION ledger_immutable();

-- Debits must equal credits, checked at COMMIT so a transaction can be
-- built up with several INSERTs.
CREATE OR REPLACE FUNCTION ledger_balanced() RETURNS trigger AS $$
DECLARE
  delta bigint;
BEGIN
  SELECT COALESCE(SUM(CASE WHEN side = 'debit' THEN amount_minor ELSE -amount_minor END), 0)
    INTO delta FROM ledger_entries WHERE transaction_id = NEW.transaction_id;
  IF delta <> 0 THEN
    RAISE EXCEPTION 'ledger transaction % does not balance (off by %)', NEW.transaction_id, delta;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER ledger_entries_balanced
  AFTER INSERT ON ledger_entries
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION ledger_balanced();

-- Daily per-channel rollup, derived from the ledger for fast Studio reads.
CREATE TABLE creator_earnings (
  channel_id      uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  day             date NOT NULL,
  currency        char(3) NOT NULL DEFAULT 'INR',
  ad_minor        bigint NOT NULL DEFAULT 0,
  membership_minor bigint NOT NULL DEFAULT 0,
  other_minor     bigint NOT NULL DEFAULT 0,
  platform_fee_minor bigint NOT NULL DEFAULT 0,
  net_minor       bigint NOT NULL DEFAULT 0,
  computed_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, day)
);

CREATE TYPE payout_state AS ENUM ('requested', 'approved', 'processing', 'paid', 'failed', 'cancelled');

CREATE TABLE payouts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id       uuid NOT NULL REFERENCES channels(id) ON DELETE RESTRICT,
  amount_minor     bigint NOT NULL CHECK (amount_minor > 0),
  tax_withheld_minor bigint NOT NULL DEFAULT 0 CHECK (tax_withheld_minor >= 0),
  currency         char(3) NOT NULL DEFAULT 'INR',
  state            payout_state NOT NULL DEFAULT 'requested',
  period_start     date NOT NULL,
  period_end       date NOT NULL,
  provider         text,
  provider_ref     text,
  idempotency_key  text UNIQUE NOT NULL,
  ledger_txn_id    uuid REFERENCES ledger_transactions(id) ON DELETE SET NULL,
  requested_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  failure_reason   text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payouts_period CHECK (period_end >= period_start)
);
CREATE INDEX payouts_channel_idx ON payouts (channel_id, created_at DESC);
CREATE INDEX payouts_queue_idx   ON payouts (state, created_at) WHERE state IN ('requested', 'approved');
CREATE TRIGGER payouts_touch BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
