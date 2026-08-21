-- Gamification / engagement points system (customer-requested, not a v1
-- port - v1 has no points/leaderboard concept at all). Two brand-new tables,
-- nothing existing altered - CREATE TABLE on an empty table is instant and
-- can't affect any existing query, unlike an ALTER TABLE on a huge existing
-- table would be. Applied to the local shadow DB only in this session;
-- applying to the real prod database still needs the maintainer's own call,
-- same standing rule as every other prod change this project has followed.

CREATE TABLE point_transaction (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  points INT NOT NULL,
  reason VARCHAR(50) NOT NULL,
  -- Idempotency key: constant per (user, action-instance) for toggleable
  -- states (e.g. `read:book:123`, `like:book:123` - re-toggling the same
  -- state doesn't re-earn), naturally unique per row for creation events
  -- (e.g. `comment:456` - every real new comment deserves its own points).
  reason_key VARCHAR(150) NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_point_transaction_user_reason_key (user_id, reason_key),
  KEY idx_point_transaction_user (user_id),
  KEY idx_point_transaction_created (created_at),
  CONSTRAINT fk_point_transaction_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE weekly_winner (
  id INT AUTO_INCREMENT PRIMARY KEY,
  -- ISO year-week, e.g. '2026-W34' - one official winner recorded per week.
  year_week VARCHAR(10) NOT NULL,
  user_id INT NOT NULL,
  points INT NOT NULL,
  -- Which book the system is gifting them - an admin picks this manually
  -- when finalizing the week (real-world book fulfillment isn't something
  -- the app can automate), so nullable until that happens.
  prize_book_id INT NULL,
  fulfilled TINYINT NOT NULL DEFAULT 0,
  fulfilled_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_weekly_winner_year_week (year_week),
  KEY idx_weekly_winner_user (user_id),
  CONSTRAINT fk_weekly_winner_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  CONSTRAINT fk_weekly_winner_book FOREIGN KEY (prize_book_id) REFERENCES book(id) ON DELETE SET NULL
) ENGINE=InnoDB;
