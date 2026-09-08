-- Hand-written migration, applied manually (never drizzle-kit push/generate).

-- Customer's explicit question (2026-09-09): "Destek talebi yada yazar
-- talebin vb yapan kişilere soru cevap yada yanıt gerekirse çözüldü
-- dışında yanıt nasıl ilerler iletişim kanalı olarak" - support_ticket
-- only ever had a status toggle (open/resolved), no way for an admin to
-- actually write back to the requester. Adds a real one-way reply -
-- notified via the existing notification system when the requester is a
-- real account (user_id set), or emailed via the existing Brevo mailer
-- when the ticket came from a signed-out visitor (email-only).
ALTER TABLE support_ticket
  ADD COLUMN admin_reply TEXT NULL,
  ADD COLUMN replied_at DATETIME NULL;
