-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB on 2026-08-21. NOT YET applied to
-- the real prod database.
--
-- Phase 2 (PLAN.md): adds the customer-requested "yarıda bıraktım" (dropped)
-- reading status, with a structured reason + drop-off percentage - the
-- existing `read.status` varchar(50) already accepts any string, so the new
-- status value itself needs no schema change, just these two new columns to
-- carry the extra data that status implies.
--
-- Also adds a UNIQUE(user_id, book_id) constraint, making `read` a proper
-- upsert target: one current reading-status row per user+book. v1's schema
-- had a `year` column suggesting it may have tolerated multiple rows per
-- book across different years (re-reads) - this migration deliberately
-- narrows that to "one current status, `year` records when it was last set"
-- for v2, since that matches every UI use case seen in the customer's notes
-- (there's no re-read-tracking feature requested). Revisit if that turns out
-- wrong.

ALTER TABLE `read` ADD COLUMN drop_reason VARCHAR(30) NULL AFTER status;
ALTER TABLE `read` ADD COLUMN drop_percentage TINYINT UNSIGNED NULL AFTER drop_reason;
ALTER TABLE `read` ADD UNIQUE KEY uniq_read_user_book (user_id, book_id);

-- `library_book` (bookId, ownerId) already exists as a genuinely separate
-- table from `read` - the "kitaplığım (ownership) vs reading status" split
-- the customer asked for already exists at the schema level. The bug they
-- were describing is a v1 UI/UX conflation, not a missing schema split - no
-- migration needed for that half of the Phase 2 ask, just correct v2 UI.
