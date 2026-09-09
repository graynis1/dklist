-- Customer's ask (2026-09-09): richer activity feed events matching a
-- reference design ("137. sayfaya geldi -> %42 tamamlandı", "4 günde
-- bitirdi -> okuma süresi") - neither page-progress nor a real start/finish
-- date span existed anywhere in the schema before this. `minutes_read`
-- (manual, already existed) is a different, independent stat.
ALTER TABLE `read`
  ADD COLUMN started_at DATETIME NULL,
  ADD COLUMN finished_at DATETIME NULL,
  ADD COLUMN current_page INT NULL;
