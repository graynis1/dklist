-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only on 2026-08-21. NOT YET applied
-- to the real prod database - same standing rule as every other schema
-- change this project has made (0001-0010).
--
-- Maintainer's explicit ask: expose the points system's values in the admin
-- panel instead of hardcoded constants, plus real spam protection on
-- comment/rating point-earning (comments had NO cap at all - a user could
-- post unlimited low-effort comments across many books to farm points
-- indefinitely, unlike ratings which were already naturally capped per
-- entity via their reasonKey). Key-value shape (not one column per point
-- type, unlike marketplace_settings/premium_settings) since new point
-- sources get added over time and a key-value row doesn't need a schema
-- migration each time - just a new default entry in code.

CREATE TABLE point_setting (
  setting_key VARCHAR(50) NOT NULL PRIMARY KEY,
  points INT NOT NULL,
  updated_date DATETIME NULL
);
