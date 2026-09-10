-- Real incident (2026-09-10): category_tr_book (migration 0052) only ever
-- covered the "tr" bucket - the "not-tr" bucket (every other language:
-- English, German, French, etc.) has the exact same disease and no fix at
-- all, confirmed live: category 947 (lang != 'tr', sorted by score) took
-- 38+ seconds, hitting the same "sparse intersection at the wrong end of a
-- huge global sort order" latency wall, just against the ~98.5M-book
-- global population instead of the ~126K Turkish one - no lang-scoped
-- composite index exists (or can exist) for a `lang != 'tr'` negation, so
-- this always fell back to a full FORCE INDEX scan on the global
-- score/view_count index. Same fix, same shape: persist the actual
-- matching book ids the one time the expensive scan has to run.
CREATE TABLE category_non_tr_book (
  category_id INT NOT NULL,
  book_id INT NOT NULL,
  view_count INT NOT NULL,
  score DOUBLE NOT NULL,
  PRIMARY KEY (category_id, book_id),
  KEY idx_category_non_tr_book_viewcount (category_id, view_count),
  KEY idx_category_non_tr_book_score (category_id, score)
);
