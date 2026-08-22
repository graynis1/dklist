-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only. NOT YET applied to prod -
-- same standing rule as every other schema change this project has made.
--
-- Real gap in the email-based 2FA built earlier this session: if Brevo
-- SMTP delivery hiccups (or is slow) at the exact moment of login, there
-- was no way in for a legitimate user with a correct password - a single-
-- use recovery code, shown once right after enabling 2FA, is the standard
-- mitigation (GitHub/Google-style). Hashed at rest like the password
-- column, never stored in plaintext.

CREATE TABLE two_factor_recovery_code (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  used_at DATETIME,
  created_at DATETIME NOT NULL,
  CONSTRAINT FK_two_factor_recovery_code_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE,
  KEY idx_two_factor_recovery_code_user (user_id)
);
