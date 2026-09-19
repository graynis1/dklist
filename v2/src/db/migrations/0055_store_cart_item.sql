-- Customer's Askıda Kitap ask: "sepete ekle yapabilir miyiz... seçilenleri
-- sepete ekleyip en son onaylamak gibi" (add to cart, approve/checkout at
-- the end, like a real shopping site). Only meaningful for PAID listings -
-- a free listing has no checkout to build up to. One row per (user,
-- listing) - a plain toggle, same shape as store_favorite.
CREATE TABLE store_cart_item (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  store_id INT NOT NULL,
  created_date DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_store_cart_item_user_store (user_id, store_id),
  KEY idx_store_cart_item_user (user_id),
  KEY idx_store_cart_item_store (store_id)
);
