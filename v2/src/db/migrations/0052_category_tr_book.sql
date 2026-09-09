-- Real incident (2026-09-09, continued): idx_book_lang_viewcount made the
-- underlying query CORRECT but not fast enough for a category where the
-- Turkish books are a rare intersection clustered at the "wrong" end of
-- the sort order (confirmed live: category 1781's 36 Turkish books all
-- have view_count=0, so scanning Turkish books in view_count DESC order
-- to find them still means walking most/all of the ~126K global Turkish
-- population, each needing a random point-lookup into book_category to
-- check category membership - ~21s even with the right index, since this
-- is a latency-bound "many random lookups" problem no single index on
-- `book` alone can fix). This table persists the ACTUAL matching book
-- ids (not just a count) the one time the expensive scan has to run, so
-- every future page load - any page, any sort - is a plain indexed
-- lookup on category_id, nothing more.
CREATE TABLE category_tr_book (
  category_id INT NOT NULL,
  book_id INT NOT NULL,
  view_count INT NOT NULL,
  score DOUBLE NOT NULL,
  PRIMARY KEY (category_id, book_id),
  KEY idx_category_tr_book_viewcount (category_id, view_count),
  KEY idx_category_tr_book_score (category_id, score)
);
