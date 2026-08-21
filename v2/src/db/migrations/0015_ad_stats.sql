-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only. NOT YET applied to prod -
-- same standing rule as every other schema change this project has made.
--
-- Customer's own requirements dump explicitly asked for this and it was
-- never built: "Advertiser-facing stats page (reach/performance numbers)
-- to justify ad placement to prospective advertisers, 1000kitap 'reklam
-- ver' page style." Simple denormalized counters, incremented on every
-- real impression/click - no separate event-log table needed for this
-- scale (ad count is tiny, exact per-event history isn't the ask, just
-- reach/performance totals).

ALTER TABLE advertisement
  ADD COLUMN impressions INT NOT NULL DEFAULT 0,
  ADD COLUMN clicks INT NOT NULL DEFAULT 0;
