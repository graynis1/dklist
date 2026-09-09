-- Customer's ask (2026-09-08 batch, "seller reviews restricted to real
-- transactions" - revisited): a free (non-Iyzico) listing had no "who did
-- this go to" record at all. Nullable, set only when the owner marks a
-- free listing as completed with a known buyer - see store.ts's
-- markStoreCompletedWithBuyer().
ALTER TABLE store
  ADD COLUMN sold_to_user_id INT NULL,
  ADD CONSTRAINT fk_store_sold_to_user FOREIGN KEY (sold_to_user_id) REFERENCES user (id) ON DELETE SET NULL;

CREATE INDEX idx_store_sold_to_user ON store (sold_to_user_id);
