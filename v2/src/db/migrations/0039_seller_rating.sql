-- Hand-written migration, applied manually (never drizzle-kit push/generate).

-- Real customer report (2026-09-05, Askıda Kitap section): "satıcı için
-- satıcı puanı ve yorum kısmı olabilmeli... İlanda ki isminin yanında
-- görünmeli" (Trendyol-style). The `score`/`comment` tables are already
-- generic (target_id + target_type varchar), so a seller rating/review is
-- just a new target_type "user" against that same machinery, no new
-- rating/comment tables needed. Only the denormalized average needs a
-- home - same "book.score"/"writer.score" pattern this app already uses
-- for cheap reads, since a listing page shouldn't AVG() the score table
-- on every view.
ALTER TABLE user ADD COLUMN seller_score DOUBLE NULL AFTER profile_frame;
ALTER TABLE user ADD COLUMN seller_rating_count INT NOT NULL DEFAULT 0 AFTER seller_score;
