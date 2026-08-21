-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only on 2026-08-21. NOT YET applied
-- to the real prod database - same standing rule as every other schema
-- change this project has made (0001-0009).
--
-- Phase 8 (Monetization) - the customer's own PLAN.md notes flagged this as
-- needing a follow-up question ("premium membership 'özel durumlara
-- insiyatif' - which special cases beyond ad-free" was never answered).
-- Maintainer explicitly authorized proceeding on judgment ("en iyisini
-- yap"). Scoped deliberately: a ONE-TIME purchase (not a recurring
-- subscription) for a fixed duration, reusing the direct (non-marketplace,
-- no sub-merchant split) iyzico checkout - simpler and safer to build
-- correctly than wiring iyzico's separate subscription-billing API for a
-- feature whose exact scope the customer hasn't even settled on yet.
-- Benefit shipped now: ad-free browsing (the one thing the customer's own
-- notes actually named). Additional perks can be layered on later once the
-- customer answers what else "premium" should unlock.

CREATE TABLE premium_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  active TINYINT NOT NULL DEFAULT 0,
  price_kurus INT NOT NULL DEFAULT 4900,
  duration_days INT NOT NULL DEFAULT 365,
  updated_date DATETIME NULL
);

INSERT INTO premium_settings (active, price_kurus, duration_days) VALUES (0, 4900, 365);

CREATE TABLE premium_purchase (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount_kurus INT NOT NULL,
  duration_days INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending_payment',
  starts_at DATETIME NULL,
  expires_at DATETIME NULL,
  iyzico_conversation_id VARCHAR(255) NULL,
  iyzico_token VARCHAR(255) NULL,
  iyzico_payment_id VARCHAR(255) NULL,
  created_date DATETIME NOT NULL,
  updated_date DATETIME NULL,
  INDEX idx_premium_purchase_user (user_id),
  INDEX idx_premium_purchase_token (iyzico_token),
  CONSTRAINT fk_premium_purchase_user FOREIGN KEY (user_id) REFERENCES `user`(id)
);

CREATE TABLE advertisement (
  id INT AUTO_INCREMENT PRIMARY KEY,
  placement VARCHAR(50) NOT NULL DEFAULT 'homepage-banner',
  image VARCHAR(255) NOT NULL,
  link_url VARCHAR(500) NULL,
  active TINYINT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_date DATETIME NOT NULL,
  INDEX idx_advertisement_placement (placement, active)
);
