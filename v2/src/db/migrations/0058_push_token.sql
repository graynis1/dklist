-- Mobile push notifications - the device-token table flagged as "not
-- built yet" in every mobile pass so far. One row per (user, token): a
-- user can have several devices, and the same physical device could in
-- principle get a new Expo push token (reinstall, data clear) - kept as
-- a real UNIQUE on the token itself so a stale token from a previous
-- user (device changed hands) is reassigned rather than duplicated.
CREATE TABLE push_token (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  platform VARCHAR(20) NOT NULL DEFAULT 'unknown',
  created_date DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_push_token_token (token),
  KEY idx_push_token_user (user_id)
);
