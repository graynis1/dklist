-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only. NOT YET applied to prod -
-- same standing rule as every other schema change this project has made.
--
-- Customer posed ad country/language targeting as an open QUESTION, not an
-- answer ("needs per-ad country/language targeting... flagged by the
-- customer as an open question, not resolved"). Maintainer's explicit ask
-- this pass: build it myself with good judgment rather than leave it
-- unbuilt. True visitor-GEO targeting would need a paid IP-geolocation
-- service (against the standing "no paid services" rule) - built CONTENT-
-- language targeting instead: an ad can target a specific language (shown
-- only in that language's content context, e.g. a book page for a
-- lang='en' book) or NULL ("all languages", the default - matches every
-- existing ad's behavior unchanged). No new dependency, and it serves the
-- same underlying goal (relevant-language ads) without guessing at a
-- visitor's country from their IP.

ALTER TABLE advertisement
  ADD COLUMN language VARCHAR(10) NULL AFTER placement;
