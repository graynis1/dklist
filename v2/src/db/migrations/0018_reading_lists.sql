-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only. NOT YET applied to prod -
-- same standing rule as every other schema change this project has made.
--
-- Fifth item from the "what else could be added" brainstorm list: a
-- curated-list feature (Letterboxd "Lists" style) - the customer's own
-- vision statement explicitly cites Letterboxd as a comparison, but this
-- specific feature (a named, user-curated, shareable book collection,
-- distinct from "kitaplığım"/reading-status) was never built.

CREATE TABLE reading_list (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  description VARCHAR(500) NULL,
  is_public TINYINT NOT NULL DEFAULT 1,
  created_date DATETIME NOT NULL,
  KEY idx_reading_list_owner (owner_id),
  UNIQUE KEY uniq_reading_list_slug (slug),
  CONSTRAINT FK_reading_list_owner FOREIGN KEY (owner_id) REFERENCES user (id)
);

CREATE TABLE reading_list_book (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  list_id INT NOT NULL,
  book_id INT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  added_at DATETIME NOT NULL,
  UNIQUE KEY uniq_reading_list_book (list_id, book_id),
  CONSTRAINT FK_reading_list_book_list FOREIGN KEY (list_id) REFERENCES reading_list (id),
  CONSTRAINT FK_reading_list_book_book FOREIGN KEY (book_id) REFERENCES book (id)
);
