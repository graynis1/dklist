-- Hand-written migration, applied manually (never drizzle-kit push/generate).

-- Real customer report (2026-09-05): "Mesajı silinen kişi tekrar yazınca
-- geçmişteki tüm yazışmalar geri geliyor" - deleteChat()/deleteAllChats()
-- only ever hid the CHAT row (hiddenForFirstUser/hiddenForSecondUser), and
-- sendMessage() unconditionally clears both hidden flags on any new
-- message - so a new reply resurrected the entire old thread for the
-- person who deleted it, not just the new message. Modern chat apps
-- (WhatsApp/Telegram/Signal) genuinely clear history on delete: a later
-- message starts fresh, the old thread doesn't come back. These two
-- per-user cursors record "everything up to and including this message id
-- is cleared for this user" - getMessages() filters below it, deleteChat()/
-- deleteAllChats() set it to the chat's current max message id.
ALTER TABLE chat ADD COLUMN first_user_cleared_through_id INT NULL AFTER hidden_for_first_user;
ALTER TABLE chat ADD COLUMN second_user_cleared_through_id INT NULL AFTER hidden_for_second_user;
