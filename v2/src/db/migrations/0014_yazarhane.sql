-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only. NOT YET applied to prod -
-- same standing rule as every other schema change this project has made.
--
-- "Yazarhane" (author's lounge/hub) - customer's own notes explicitly
-- flagged its exact scope as undefined, an open question for the customer
-- to answer later. Maintainer's explicit ask this pass: build it myself
-- with good judgment rather than leave it unbuilt. Scoped as: a real
-- author-member's (userType='Yazar') content hub, linked to their actual
-- catalog `writer` record (same 1:1-link pattern user.publisher_id already
-- uses for Yayınevi members - UNIQUE so one writer record links to at most
-- one real member account), where they can post reader-facing updates
-- shown on their own hub page and a site-wide /yazarhane feed. Lighter
-- than the Blog system (no approval flow - Blog is for the separate
-- Blogger role/editorial content) since these are the author's own
-- identity-linked posts, not moderated articles.

ALTER TABLE user
  ADD COLUMN writer_id INT NULL AFTER publisher_id,
  ADD CONSTRAINT UNIQ_user_writer_id UNIQUE (writer_id),
  ADD CONSTRAINT FK_user_writer_id FOREIGN KEY (writer_id) REFERENCES writer (id);

CREATE TABLE yazarhane_post (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_date DATETIME NOT NULL,
  KEY idx_yazarhane_post_user (user_id),
  CONSTRAINT FK_yazarhane_post_user FOREIGN KEY (user_id) REFERENCES user (id)
);
