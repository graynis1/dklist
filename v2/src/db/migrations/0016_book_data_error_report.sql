-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only. NOT YET applied to prod -
-- same standing rule as every other schema change this project has made.
--
-- Second item from the "what else could be added" brainstorm list: a
-- "hata bildir" (report a data error) button on the book page, feeding
-- the existing notice/moderation queue with a new type rather than a
-- separate table - same shape as the existing user_report/comment types
-- (a dedicated FK column per report kind, matching notice.comment_id's own
-- existing convention, not a generic target_id/target_type retrofit).

ALTER TABLE notice
  ADD COLUMN book_id INT NULL,
  ADD CONSTRAINT FK_notice_book_id FOREIGN KEY (book_id) REFERENCES book (id);
