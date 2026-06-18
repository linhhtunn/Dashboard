-- Supabase/Postgres setup for LangGraph long-term memory store.
--
-- Run this in Supabase SQL Editor before setting:
--   MEMORY_STORE=supabase
--   SUPABASE_DB_URL=postgresql://...
--
-- The table names and schemas match langgraph.store.postgres' PostgresStore / AsyncPostgresStore schemas.
-- If the package schema changes in a future version, prefer the package's
-- built-in migration command and keep this file in sync.

-- 1. Create store_migrations table to track schema versions
CREATE TABLE IF NOT EXISTS store_migrations (
    v INTEGER PRIMARY KEY
);

-- Seed migrations metadata (version 3 is current)
INSERT INTO store_migrations (v)
VALUES (0), (1), (2), (3)
ON CONFLICT (v) DO NOTHING;

-- 2. Create store table for key-value namespaces
CREATE TABLE IF NOT EXISTS store (
    -- 'prefix' represents the doc's 'namespace'
    prefix text NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    ttl_minutes INT,
    PRIMARY KEY (prefix, key)
);

-- 3. Create indexes
-- Prefix pattern matching index for prefix lookups
CREATE INDEX IF NOT EXISTS store_prefix_idx ON store USING btree (prefix text_pattern_ops);

-- Index for TTL expiration sweep
CREATE INDEX IF NOT EXISTS idx_store_expires_at ON store (expires_at)
WHERE expires_at IS NOT NULL;
