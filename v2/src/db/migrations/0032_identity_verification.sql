-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Maintainer's ask: "doğrulanmış okur olayı için de bir kimlik gönderme
-- doğrulama bekleme vs gibi alan ekle profillere sürece uygun şekilde" -
-- user.verified already exists (blue-check marker) but was only ever set by
-- a bare admin toggle with no real request/review process behind it. This
-- adds the actual submit -> pending -> approve/reject queue: a user uploads
-- an ID photo + optional note, an Admin/Kurucu reviews it, approval flips
-- user.verified the same way the existing manual toggle already does.

CREATE TABLE identity_verification (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  document_image VARCHAR(255) NOT NULL,
  note VARCHAR(255),
  reviewer_note VARCHAR(255),
  submitted_at DATETIME NOT NULL,
  reviewed_at DATETIME,
  reviewed_by INT,
  CONSTRAINT FK_identity_verification_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE,
  CONSTRAINT FK_identity_verification_reviewer FOREIGN KEY (reviewed_by) REFERENCES user (id) ON DELETE SET NULL
);

-- A user can have at most one PENDING request at a time (checked in app code
-- before insert, same "no DB-level partial unique index" pattern already
-- used elsewhere in this schema for status-scoped uniqueness) - a plain
-- index here is just for the admin queue's own lookups, not a constraint.
CREATE INDEX idx_identity_verification_status ON identity_verification (status);
CREATE INDEX idx_identity_verification_user ON identity_verification (user_id);
