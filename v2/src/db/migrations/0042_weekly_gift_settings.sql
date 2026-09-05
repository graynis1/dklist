-- Hand-written migration, applied manually (never drizzle-kit push/generate).

-- Real customer report (2026-09-05, admin panel section): "hediye kitap
-- etmediğim an yanlış vaat yaramamak için bunu nasıl ayarlarız" - the
-- public /puan-tablosu page unconditionally promises a weekly book gift
-- every week, regardless of whether the admin actually has a book lined
-- up that week. Same single-row settings pattern as premium_settings/
-- store_pin_settings.
CREATE TABLE weekly_gift_settings (
  id INT NOT NULL AUTO_INCREMENT,
  active TINYINT NOT NULL,
  note VARCHAR(255) NULL,
  updated_date DATETIME NULL,
  PRIMARY KEY (id)
);
