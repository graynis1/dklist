-- Hand-written migration, applied manually (never drizzle-kit push/generate).

-- Real customer report (2026-09-05): blog posts had no like/dislike and no
-- comments at all, unlike every other content type on the site. Mirrors
-- feed_post_like's exact shape (see migration 0030's own doc comment for
-- why value is a signed 1/-1 tinyint, not a separate dislike table).
CREATE TABLE blog_like (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  blog_id INT NOT NULL,
  value TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_blog_like (user_id, blog_id),
  KEY idx_blog_like_blog (blog_id),
  CONSTRAINT fk_blog_like_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE,
  CONSTRAINT fk_blog_like_blog FOREIGN KEY (blog_id) REFERENCES blog (id) ON DELETE CASCADE
);

-- Customer's ask: "bloger eğer isterse yorum yapmayı kapabilmeli" - the
-- author's own per-post toggle, checked before rendering the comment form
-- (existing comments always stay visible even if later disabled, matching
-- how e.g. YouTube's own "comments off" behaves - it hides new input, not
-- history).
ALTER TABLE blog ADD COLUMN comments_disabled TINYINT NOT NULL DEFAULT 0 AFTER has_pending_revision;
