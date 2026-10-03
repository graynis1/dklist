-- Club branding + in-club posts (customer feedback 2026-10-01).
--
-- 1. book_club.image / book_club.color - a club logo the owner uploads and
--    an accent color, so a club page isn't "tek düze soğuk bir yazı".
-- 2. feed_post.club_id - in-club posts reuse the existing feed_post
--    machinery (text + image + likes + two-level replies) scoped to one
--    club. Club posts are never written to point_transaction as
--    "feed_post", so they never leak into the public Akış.
-- 3. book_club_member.role gains "admin" (no schema change - varchar(10)):
--    an owner can let chosen members manage the club.
--
-- The two pre-existing club discussion comments (comment.type='bookClub')
-- are copied into feed_post by scripts/migrate-club-comments.mts (needs
-- per-row id mapping to re-parent their replies, so not plain SQL).
ALTER TABLE book_club ADD COLUMN image VARCHAR(255) NULL, ADD COLUMN color VARCHAR(9) NULL;
ALTER TABLE feed_post ADD COLUMN club_id INT NULL, ADD KEY idx_feed_post_club (club_id, id);
