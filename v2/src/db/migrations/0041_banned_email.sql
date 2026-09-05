-- Hand-written migration, applied manually (never drizzle-kit push/generate).

-- Real customer report (2026-09-05, admin panel section): "yanlış kişiyi
-- silsen yine aynı hesapla geri geliş mümkün engelleme olmalı maile
-- sanki. Engelleyip sonra silebilir." (delete the wrong/a bad-actor
-- account and they can just re-register with the same email - there
-- should be a block, tied to the email). This is a DIFFERENT concept
-- from `user_block` (migration 0021, user-to-user social blocking) - an
-- admin-side email blocklist checked at registration time, independent
-- of whether the original account still exists.
CREATE TABLE banned_email (
  id INT NOT NULL AUTO_INCREMENT,
  email VARCHAR(50) NOT NULL,
  reason VARCHAR(255) NULL,
  banned_by_admin_id INT NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_banned_email (email),
  CONSTRAINT fk_banned_email_admin FOREIGN KEY (banned_by_admin_id) REFERENCES user (id)
);
