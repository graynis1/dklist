-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only on 2026-08-21. NOT YET applied
-- to the real prod database - same standing rule as every other schema
-- change this project has made (0001-0004), tracked as pending-apply-to-prod
-- backlog rather than done unilaterally.
--
-- Phase 6 (PLAN.md): customer's "share another user's review/quote to your
-- own feed with your own commentary" (Facebook share-with-caption style).
-- Reuses the existing `comment` table instead of a new "repost" entity - a
-- share IS a new comment/quote row (same target, same yorum/alıntı type),
-- just one that also points back at the comment it was shared from. NULL
-- for every ordinary comment; only set on a reshare.
-- No FK constraint (self-referencing FK on this table would need a second
-- ALTER after creation and the table has no FK on most of its other columns
-- either) - integrity is enforced at the query layer (shareEntityComment()
-- always inserts a real, looked-up comment id).

ALTER TABLE comment ADD COLUMN shared_from_comment_id INT NULL AFTER target_id;
