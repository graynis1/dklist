-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only on 2026-08-21. NOT YET applied
-- to the real prod database - same standing rule as every other schema
-- change this project has made (0001-0008), tracked as pending-apply-to-prod
-- backlog rather than done unilaterally.
--
-- IMPORTANT CORRECTION: this migration originally (wrongly) CREATE TABLE'd
-- marketplace_settings/seller_payout_profile/store_order from scratch,
-- assuming none of them existed yet. They actually already do - all three
-- were part of the very first 2026-08-20 drizzle-kit pull snapshot from the
-- real production database (schema.ts already had them fully defined this
-- whole time, missed on the first read) - meaning v1's real (uncommitted,
-- git-status-only) Iyzico marketplace entities were already migrated onto
-- the live prod schema at some point, just never committed as PHP code.
-- The original CREATE-from-scratch attempt briefly and mistakenly dropped
-- the real marketplace_settings table on the shadow DB before this was
-- caught - restored to its exact original shape (id/active/commission_rate/
-- updated_date only) before this corrected migration below ran.
--
-- The only genuinely NEW schema change needed is these 3 columns:
-- marketplace_settings only ever held active/commissionRate in v1, reading
-- the actual Iyzico API keys from static env vars - extended here per the
-- maintainer's explicit ask: entering real keys via the admin panel must
-- take effect immediately, not require a redeploy/env change.

ALTER TABLE marketplace_settings
  ADD COLUMN iyzico_api_key VARCHAR(255) NULL AFTER commission_rate,
  ADD COLUMN iyzico_secret_key VARCHAR(255) NULL AFTER iyzico_api_key,
  ADD COLUMN iyzico_base_url VARCHAR(255) NOT NULL DEFAULT 'https://sandbox-api.iyzipay.com' AFTER iyzico_secret_key;

INSERT INTO marketplace_settings (active, commission_rate, iyzico_base_url) VALUES (0, 5.0, 'https://sandbox-api.iyzipay.com');
