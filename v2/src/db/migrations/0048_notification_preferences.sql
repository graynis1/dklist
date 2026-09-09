-- Customer's ask: per-notification-type opt-in/out preferences, plus a
-- "club" notification type for new club activity (see book-clubs.ts).
-- `type` defaults to 'system' so every existing row (and every call site
-- not explicitly updated to pass a type) keeps working unchanged.
ALTER TABLE dknotifiaction
  ADD COLUMN type VARCHAR(30) NOT NULL DEFAULT 'system';

CREATE TABLE notification_preference (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  type VARCHAR(30) NOT NULL,
  enabled TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notification_preference_user_type (user_id, type),
  KEY idx_notification_preference_user (user_id),
  CONSTRAINT fk_notification_preference_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE
);
