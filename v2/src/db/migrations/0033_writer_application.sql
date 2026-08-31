-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Maintainer's ask: "Yazarhane tarafında yazacak yazarlar için başvuru
-- formu vs ekle ek bir kullanıcı tipi yoksa ekle" - the `Yazar` role
-- already exists precisely for this ("yazacak yazarlar" - author members
-- who can post to Yazarhane), so no new role type is added; what was
-- actually missing was a real self-service application path. Previously
-- the ONLY way to become a Yazar member was an Admin manually changing a
-- user's role in /admin/kullanicilar - no request/review process behind it.

CREATE TABLE writer_application (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message VARCHAR(1000) NOT NULL,
  proposed_writer_id INT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewer_note VARCHAR(255),
  submitted_at DATETIME NOT NULL,
  reviewed_at DATETIME,
  reviewed_by INT,
  CONSTRAINT FK_writer_application_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE,
  CONSTRAINT FK_writer_application_writer FOREIGN KEY (proposed_writer_id) REFERENCES writer (id) ON DELETE SET NULL,
  CONSTRAINT FK_writer_application_reviewer FOREIGN KEY (reviewed_by) REFERENCES user (id) ON DELETE SET NULL
);

CREATE INDEX idx_writer_application_status ON writer_application (status);
CREATE INDEX idx_writer_application_user ON writer_application (user_id);
