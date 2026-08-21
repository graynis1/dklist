-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only. NOT YET applied to prod -
-- same standing rule as every other schema change this project has made.
--
-- Sixth item from the "what else could be added" brainstorm list: a
-- monthly community-read pick ("Ayın Kitabı"). Discussion deliberately
-- reuses the book's own existing comment section (getEntityComments)
-- rather than a new thread system - fragmenting discussion across two
-- separate comment systems for the same book would be worse than just
-- pointing at the one that already exists.

CREATE TABLE book_of_month (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  book_id INT NOT NULL,
  period_label VARCHAR(50) NOT NULL,
  starts_at DATE NOT NULL,
  active TINYINT NOT NULL DEFAULT 1,
  created_date DATETIME NOT NULL,
  KEY idx_book_of_month_active (active),
  CONSTRAINT FK_book_of_month_book FOREIGN KEY (book_id) REFERENCES book (id)
);

CREATE TABLE book_of_month_participant (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  book_of_month_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at DATETIME NOT NULL,
  UNIQUE KEY uniq_bom_participant (book_of_month_id, user_id),
  CONSTRAINT FK_bom_participant_bom FOREIGN KEY (book_of_month_id) REFERENCES book_of_month (id),
  CONSTRAINT FK_bom_participant_user FOREIGN KEY (user_id) REFERENCES user (id)
);
