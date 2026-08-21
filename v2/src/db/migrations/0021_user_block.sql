-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only. NOT YET applied to prod -
-- same standing rule as every other schema change this project has made.
--
-- Real safety gap: v2 has "Şikayet Et" (report) but no way for a user to
-- actually stop someone from contacting them - a report only reaches
-- admins, it doesn't change what the reported user can do in the
-- meantime. Blocking is a separate, user-controlled, immediate action.

CREATE TABLE user_block (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  blocker_id INT NOT NULL,
  blocked_id INT NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uniq_user_block (blocker_id, blocked_id),
  CONSTRAINT FK_user_block_blocker FOREIGN KEY (blocker_id) REFERENCES user (id),
  CONSTRAINT FK_user_block_blocked FOREIGN KEY (blocked_id) REFERENCES user (id)
);
