-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only. NOT YET applied to prod -
-- same standing rule as every other schema change this project has made.
--
-- Replaces the "DK AI chatbot" idea from Phase 7 for the support use case -
-- maintainer's explicit call: a real chatbot needs a paid LLM API (no GPU
-- on the VPS to self-host one, confirmed via SSH), and isn't actually
-- needed here. A category-routed FAQ + a plain support-ticket inbox covers
-- the real need (answer common questions, forward anything else to a
-- person) with zero AI/paid-API dependency.

CREATE TABLE support_ticket (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  category VARCHAR(50) NOT NULL,
  email VARCHAR(150) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  created_at DATETIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  CONSTRAINT FK_support_ticket_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE SET NULL,
  KEY idx_support_ticket_status (status)
);
