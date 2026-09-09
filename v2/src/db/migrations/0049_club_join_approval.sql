-- Customer's ask (2026-09-08 batch, "answered as decision, not built" -
-- revisited now): private clubs previously had no way to require approval
-- before a join goes through, only the lighter "unlisted directory" model.
-- Kept optional (default 0) so existing private clubs keep their current
-- instant-join behavior unless the owner explicitly opts in.
ALTER TABLE book_club
  ADD COLUMN requires_approval TINYINT NOT NULL DEFAULT 0;

CREATE TABLE book_club_join_request (
  id INT NOT NULL AUTO_INCREMENT,
  club_id INT NOT NULL,
  user_id INT NOT NULL,
  requested_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_book_club_join_request (club_id, user_id),
  KEY idx_book_club_join_request_club (club_id),
  CONSTRAINT fk_book_club_join_request_club FOREIGN KEY (club_id) REFERENCES book_club (id) ON DELETE CASCADE,
  CONSTRAINT fk_book_club_join_request_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE
);
