-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Maintainer's explicit ask: real social-media reaction buttons including
-- dislike, not just like. Existing comment_like/feed_post_like rows are all
-- real likes (that was the only reaction type until now), so DEFAULT 1
-- backfills them correctly with no data migration needed beyond the
-- ALTER itself.

ALTER TABLE comment_like ADD COLUMN value TINYINT NOT NULL DEFAULT 1 AFTER comment_id;
ALTER TABLE feed_post_like ADD COLUMN value TINYINT NOT NULL DEFAULT 1 AFTER post_id;
