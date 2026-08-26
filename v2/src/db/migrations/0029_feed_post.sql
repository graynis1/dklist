-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_local dev DB only. NOT YET applied to prod - same
-- standing rule as every other schema change this project has made.
--
-- Maintainer's explicit ask: turn /akis into a real social-media platform.
-- `feed_post` is the first genuine standalone "post" concept - text and/or
-- an image, independent of any book/writer/translator. Feeds into the
-- existing point_transaction-driven activity stream (reason "feed_post")
-- rather than a second parallel feed/pagination system.

CREATE TABLE feed_post (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  text LONGTEXT,
  image VARCHAR(255),
  created_at DATETIME NOT NULL,
  KEY idx_feed_post_user (user_id),
  CONSTRAINT FK_feed_post_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE
);

CREATE TABLE feed_post_like (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  post_id INT NOT NULL,
  UNIQUE KEY uniq_feed_post_like (user_id, post_id),
  KEY idx_feed_post_like_post (post_id),
  CONSTRAINT FK_feed_post_like_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE,
  CONSTRAINT FK_feed_post_like_post FOREIGN KEY (post_id) REFERENCES feed_post (id) ON DELETE CASCADE
);
