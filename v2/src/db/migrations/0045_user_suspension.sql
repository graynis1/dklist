-- Hand-written migration, applied manually (never drizzle-kit push/generate).

-- Customer's explicit ask (2026-09-07): "Süreli uzaklaştırma banlama...
-- admin her şeyi yapabilsin" (temporary suspension, ban, admin should be
-- able to do everything). The existing `disable` column is a manual,
-- indefinite on/off toggle ("Askıya Al"/"Askıyı Kaldır" in the admin
-- panel) - this adds a genuinely TIME-LIMITED suspension that auto-lifts
-- once `suspended_until` passes, no separate "unsuspend" admin action
-- needed. Deliberately two nullable columns rather than a separate table -
-- a user can only ever have one active suspension at a time, so there's no
-- real history/multiplicity to model here (unlike banned_email, which is
-- keyed by email and can persist independently of the account).
ALTER TABLE user
  ADD COLUMN suspended_until DATETIME NULL,
  ADD COLUMN suspension_reason VARCHAR(255) NULL;
