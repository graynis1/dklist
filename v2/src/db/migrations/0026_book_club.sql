-- Book clubs / group reading - members join a club, optionally centered on
-- a "currently reading" book, and discuss via the existing generic comment
-- system (type='bookClub'). Local shadow DB only, like every hand-written
-- migration this session - not applied to production without the
-- maintainer's separate go-ahead.

CREATE TABLE book_club (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  -- Nullable + SET NULL (not CASCADE) - matches blog.owner_id's philosophy:
  -- the club and its membership/discussion outlive the founder leaving or
  -- being removed, it just loses whoever could manage its settings.
  owner_id INT NULL,
  current_book_id INT NULL,
  visibility VARCHAR(10) NOT NULL DEFAULT 'public',
  created_date DATETIME NOT NULL,
  UNIQUE KEY uniq_book_club_slug (slug),
  KEY idx_book_club_owner (owner_id),
  KEY idx_book_club_current_book (current_book_id),
  CONSTRAINT fk_book_club_owner FOREIGN KEY (owner_id) REFERENCES user(id) ON DELETE SET NULL,
  CONSTRAINT fk_book_club_current_book FOREIGN KEY (current_book_id) REFERENCES book(id)
);

CREATE TABLE book_club_member (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_id INT NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'member',
  joined_at DATETIME NOT NULL,
  UNIQUE KEY uniq_book_club_member (club_id, user_id),
  KEY idx_book_club_member_user (user_id),
  CONSTRAINT fk_book_club_member_club FOREIGN KEY (club_id) REFERENCES book_club(id) ON DELETE CASCADE,
  CONSTRAINT fk_book_club_member_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
