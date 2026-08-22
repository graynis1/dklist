-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only. NOT YET applied to prod -
-- same standing rule as every other schema change this project has made.
--
-- Advertiser-facing lead capture for /reklam-ver - the "natural next step"
-- already flagged when the impression/click stats system was built (no
-- advertiser audience existed yet at that point, so the landing page was
-- deliberately deferred). No payment/contract fields - this is a lead
-- inbox, not a billing system; Iyzico/contracts stay out of scope.

CREATE TABLE ad_inquiry (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  company VARCHAR(150),
  email VARCHAR(150) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  created_at DATETIME NOT NULL,
  handled TINYINT NOT NULL DEFAULT 0
);
