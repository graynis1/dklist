-- Customer's ask (2026-09-02): real Google AdSense ad slots, admin-managed,
-- alongside the existing direct/personal ad system (advertisement table) -
-- not a replacement for it. `adsense_setting` is a deliberate single-row
-- table (site-wide publisher id + a master on/off switch, defaults OFF so
-- nothing loads until a real, approved AdSense account exists).
-- `adsense_placement` maps each placement string (see ad-placements.ts) to
-- its own AdSense ad-unit slot id - a placement with no row here, or an
-- empty slot_id, simply falls back to the existing personal-ad system for
-- that spot.
CREATE TABLE adsense_setting (
  id INT NOT NULL DEFAULT 1 PRIMARY KEY,
  publisher_id VARCHAR(50) NULL,
  enabled TINYINT NOT NULL DEFAULT 0
);
INSERT INTO adsense_setting (id, publisher_id, enabled) VALUES (1, NULL, 0);

CREATE TABLE adsense_placement (
  placement VARCHAR(50) NOT NULL PRIMARY KEY,
  slot_id VARCHAR(50) NULL
);
