-- Hayai v2 Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address VARCHAR(42) UNIQUE NOT NULL,
  username VARCHAR(50),
  bio TEXT,
  avatar_seed VARCHAR(100),
  total_volume NUMERIC(24,6) DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_key VARCHAR(100) NOT NULL,
  trader_address VARCHAR(42) NOT NULL,
  followed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (follower_key, trader_address)
);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows (follower_key);
CREATE INDEX IF NOT EXISTS idx_follows_trader ON follows (trader_address);

CREATE TABLE IF NOT EXISTS copy_trade_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  copier_address VARCHAR(42),
  trader_address VARCHAR(42) NOT NULL,
  asset VARCHAR(20) NOT NULL,
  side VARCHAR(5) NOT NULL,
  size NUMERIC(24,6),
  price NUMERIC(24,6),
  notional NUMERIC(24,6),
  hayai_fee NUMERIC(24,6) DEFAULT 0,
  hl_response JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_revenue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_type VARCHAR(30) NOT NULL,
  copier_address VARCHAR(42),
  notional NUMERIC(24,6),
  fee_bps INTEGER,
  fee_usd NUMERIC(24,6),
  asset VARCHAR(20),
  logged_at TIMESTAMPTZ DEFAULT NOW()
);
