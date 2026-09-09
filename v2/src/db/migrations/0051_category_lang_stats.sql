-- Real incident (2026-09-09): getCategoryTurkishCount()'s "days"-lived
-- cache is Next.js Cache Components' in-memory store, which is wiped on
-- every redeploy/container restart - meaning every deploy forces every
-- category back to a cold, potentially-25s-or-timing-out recompute the
-- next time each one is visited. Persisting the result here survives
-- restarts, so a category only ever pays this cost once, period, not once
-- per deploy.
CREATE TABLE category_lang_stats (
  category_id INT NOT NULL,
  tr_count INT NOT NULL,
  computed_at DATETIME NOT NULL,
  PRIMARY KEY (category_id),
  CONSTRAINT fk_category_lang_stats_category FOREIGN KEY (category_id) REFERENCES category (id) ON DELETE CASCADE
);
