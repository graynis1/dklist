-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only on 2026-08-21. NOT YET applied
-- to the real prod database - same standing rule as every other schema
-- change this project has made (0001-0006), tracked as pending-apply-to-prod
-- backlog rather than done unilaterally.
--
-- Phase 6 (PLAN.md): customer's "Diğer mesajlar" (message requests) inbox -
-- a first message from someone the recipient doesn't follow should land in
-- a separate folder rather than the main inbox, Instagram-DM-style. v1's
-- chat system has no such concept. Flag lives on `chat` (the conversation),
-- not `message` - it's the thread's status, not a per-message property.
-- Set at chat-creation time based on whether the recipient (secondUserId)
-- follows the sender (firstUserId); cleared the first time the recipient
-- actually replies, which is treated as accepting the request.

ALTER TABLE chat ADD COLUMN is_request TINYINT NOT NULL DEFAULT 0 AFTER second_user_id;
