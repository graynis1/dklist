-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only. NOT YET applied to prod -
-- same standing rule as every other schema change this project has made.
--
-- Fourth item from the "what else could be added" brainstorm list: a
-- point store. Points currently have exactly one use (leaderboard
-- bragging rights); this gives them a spendable purpose. Scoped as a
-- simple redeemable-cosmetic system (profile "frame" - a colored ring
-- around the avatar) rather than anything tied to real payment/inventory,
-- keeping it self-contained with no Iyzico dependency.
--
-- "Spending" reuses the existing point_transaction ledger as a negative
-- entry (getUserTotalPoints already SUMs the ledger, so this needs no new
-- balance column) - the same "ledger, not a mutable counter" design this
-- whole points system already committed to.

ALTER TABLE user
  ADD COLUMN profile_frame VARCHAR(30) NULL;

CREATE TABLE point_reward (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  point_cost INT NOT NULL,
  reward_type VARCHAR(30) NOT NULL,
  reward_value VARCHAR(100) NOT NULL,
  active TINYINT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_date DATETIME NOT NULL
);

CREATE TABLE point_redemption (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reward_id INT NOT NULL,
  redeemed_at DATETIME NOT NULL,
  UNIQUE KEY uniq_point_redemption_user_reward (user_id, reward_id),
  CONSTRAINT FK_point_redemption_user FOREIGN KEY (user_id) REFERENCES user (id),
  CONSTRAINT FK_point_redemption_reward FOREIGN KEY (reward_id) REFERENCES point_reward (id)
);
