-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only. NOT YET applied to prod -
-- same standing rule as every other schema change this project has made.
--
-- Customer's Phase 4 spec: "All elevated-permission actions (mod/librarian
-- etc.) should be visible as an audit/activity log for oversight
-- (Facebook-group-admin-log style - action counts per person)." Generic
-- action/target shape so any current or future elevated action (book
-- delete, role change, merge, moderation resolve, blog approval...) can
-- log through the same helper without a schema change per action type.

CREATE TABLE admin_action_log (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NULL,
  target_id VARCHAR(100) NULL,
  detail VARCHAR(500) NULL,
  created_at DATETIME NOT NULL,
  KEY idx_admin_action_log_actor (actor_user_id),
  KEY idx_admin_action_log_created (created_at)
);
