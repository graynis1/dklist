-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only on 2026-08-21. NOT YET applied
-- to the real prod database - same standing rule as every other schema
-- change this project has made (0001-0005), tracked as pending-apply-to-prod
-- backlog rather than done unilaterally.
--
-- Phase 6 (PLAN.md): customer's "verified-account visual marker allowing an
-- 'official' profile image treatment" (blue-check style). Admin-only toggle,
-- no new admin panel needed - exposed directly on the profile page itself to
-- an Admin viewer, same pattern already used for other single admin actions
-- this session (e.g. delete-blog-button).

ALTER TABLE user ADD COLUMN verified TINYINT NOT NULL DEFAULT 0 AFTER user_type;
