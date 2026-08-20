-- Hand-written migration, applied manually (NOT via drizzle-kit push/generate,
-- see PLAN.md's "No drizzle-kit push, ever" rule). Applied to the local
-- dklist_shadow dev DB on 2026-08-21. NOT YET applied to the real prod
-- database - do that deliberately, during a maintenance window, after backing
-- up, and re-verify row counts after.
--
-- Adds the `work` grouping table from PLAN.md's Phase 1 work/edition split.
-- A `book` row IS an edition (unchanged); `book.work_id` says "these editions
-- are the same underlying work". Starts 1:1 (every existing book gets its own
-- new work row) - Phase 5's dedup pipeline is what later merges editions onto
-- a shared work_id. This migration only adds the capability, not the merging.

CREATE TABLE work (
  id INT NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE book ADD COLUMN work_id INT NULL AFTER original_book_id;
ALTER TABLE book ADD CONSTRAINT FK_book_work FOREIGN KEY (work_id) REFERENCES work(id);
CREATE INDEX idx_book_work ON book (work_id);

-- Backfill: one new work row per existing book, paired 1:1 by row order.
-- On the real ~98.5M-row prod table this INSERT+UPDATE pair must instead be
-- batched/chunked and resumable (see PLAN.md's Phase 5 notes on why - the
-- data drive is a spinning HDD, and a single unbatched statement over the
-- full table is exactly the shape of operation that killed the FULLTEXT
-- index attempts twice). This unbatched form is fine only at dev-seed scale.
INSERT INTO work (id) SELECT NULL FROM book WHERE work_id IS NULL;

UPDATE book b
JOIN (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn FROM book WHERE work_id IS NULL
) bn ON bn.id = b.id
JOIN (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn FROM work
) wn ON wn.rn = bn.rn
SET b.work_id = wn.id;

-- NOT done in this migration, deliberately deferred:
--   - Making book.work_id NOT NULL (only safe once every prod row is backfilled,
--     which is Phase 5's batched job, not this migration).
--   - Repointing score/comment tables' FK from book_id to work_id - a larger,
--     separate migration since it changes two more live tables' relationships,
--     not just adds a new column. Ratings/comments still target book_id for now.
