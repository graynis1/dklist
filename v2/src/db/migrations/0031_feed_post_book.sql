-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Maintainer's ask: let a standalone feed post optionally reference a real
-- catalog book ("kitapları ekleyebilecekleri") - a book recommendation/
-- mention as a first-class part of the post, not just free text.

ALTER TABLE feed_post ADD COLUMN book_id INT NULL AFTER image;
ALTER TABLE feed_post ADD CONSTRAINT FK_feed_post_book FOREIGN KEY (book_id) REFERENCES book (id) ON DELETE SET NULL;
