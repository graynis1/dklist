-- Publisher applications (customer 2026-10-01: "yazarhaneye başvur gibi
-- yayınevi üye olarak başvur"). Reuses writer_application with a kind
-- discriminator so admins review both in one queue; approving a
-- "publisher" application makes the user Yayinevi and links publisher_id.
ALTER TABLE writer_application
  ADD COLUMN kind VARCHAR(20) NOT NULL DEFAULT 'writer',
  ADD COLUMN proposed_publisher_id INT NULL;
