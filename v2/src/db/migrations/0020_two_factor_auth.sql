-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only. NOT YET applied to prod -
-- same standing rule as every other schema change this project has made.
--
-- Eleventh item from the "what else could be added" brainstorm list:
-- self-service email-based 2FA (a real, standing security gap - login
-- had no second factor at all). Not TOTP/authenticator-app based (would
-- need a new npm dependency and QR-code UI) - reuses the real email
-- infra already built this session instead. Separate columns from
-- pending_code/mail_auth deliberately - those are for a different
-- lifecycle (email verification / password reset), reusing them for 2FA
-- codes would risk one flow's pending state silently clobbering another's.

ALTER TABLE user
  ADD COLUMN two_factor_enabled TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN two_factor_code VARCHAR(10) NULL,
  ADD COLUMN two_factor_code_expires DATETIME NULL;
