-- Hand-written migration, applied manually (never drizzle-kit push/generate).

-- Real customer report (2026-09-05, Askıda Kitap section): "üste tutturma
-- renkli çerçeve vs gibi özellikler satın alma kısmı olabilir mi?
-- sahibinden.com da olduğu gibi." A per-LISTING paid highlight, distinct
-- from the existing site-wide Premium membership perk (which already
-- sorts a premium member's listings first / shows an "Öne Çıkan" badge as
-- an incidental benefit of being Premium, not something purchasable per
-- listing). Same shape as premium_settings/premium_purchase - one
-- purchase per row (renewal history + MAX(expires_at)), not a single
-- flag on `store`.
CREATE TABLE store_pin_settings (
  id INT NOT NULL AUTO_INCREMENT,
  active TINYINT NOT NULL,
  price_kurus INT NOT NULL,
  duration_days INT NOT NULL,
  updated_date DATETIME NULL,
  PRIMARY KEY (id)
);

CREATE TABLE store_pin_purchase (
  id INT NOT NULL AUTO_INCREMENT,
  store_id INT NOT NULL,
  user_id INT NOT NULL,
  amount_kurus INT NOT NULL,
  duration_days INT NOT NULL,
  status VARCHAR(20) NOT NULL,
  starts_at DATETIME NULL,
  expires_at DATETIME NULL,
  iyzico_conversation_id VARCHAR(255) NULL,
  iyzico_token VARCHAR(255) NULL,
  iyzico_payment_id VARCHAR(255) NULL,
  created_date DATETIME NOT NULL,
  updated_date DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_store_pin_purchase_store (store_id),
  KEY idx_store_pin_purchase_user (user_id),
  KEY idx_store_pin_purchase_token (iyzico_token),
  CONSTRAINT fk_store_pin_purchase_store FOREIGN KEY (store_id) REFERENCES store (id),
  CONSTRAINT fk_store_pin_purchase_user FOREIGN KEY (user_id) REFERENCES user (id)
);
