-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only on 2026-08-21. NOT YET applied
-- to the real prod database - same standing rule as every other schema
-- change this project has made (0001-0007), tracked as pending-apply-to-prod
-- backlog rather than done unilaterally.
--
-- Phase 2 (PLAN.md): customer's "general reading-time tracking also wanted"
-- (tacked onto the dropped-status ask, easy to miss - caught on a second,
-- closer pass of the requirements memory). No session/timer infra exists or
-- is planned - the honest minimal version is a manual "log N minutes" entry
-- per book, cumulative on the existing `read` row. Also finally makes the
-- DKList Reading Score card's "hours read" stat (part of the customer's
-- Wrapped-style ask, shipped earlier today) honestly computable - it was
-- deliberately left out before because nothing tracked reading time at all.

ALTER TABLE `read` ADD COLUMN minutes_read INT NOT NULL DEFAULT 0 AFTER drop_percentage;
