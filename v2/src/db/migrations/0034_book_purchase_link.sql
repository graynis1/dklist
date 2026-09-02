-- Customer's ask (2026-09-02): "satın al" / commission-referral links on
-- book pages. Real partner integrations (which retailers, revenue terms)
-- are a business decision that hasn't been made yet - this only builds
-- the plumbing so real links can be added the moment a deal exists,
-- without another schema change. Supports multiple retailers per book
-- (a book could reasonably link to more than one seller) rather than a
-- single bare URL column on `book`.
CREATE TABLE book_purchase_link (
  id INT AUTO_INCREMENT PRIMARY KEY,
  book_id INT NOT NULL,
  retailer_name VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_book_purchase_link_book FOREIGN KEY (book_id) REFERENCES book(id) ON DELETE CASCADE,
  INDEX idx_book_purchase_link_book (book_id)
);
