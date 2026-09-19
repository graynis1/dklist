-- Customer's explicit ask (2026-09-19): "eksik kalan her şeyi hallet...
-- en mantıklı kararı verip yap" - closes the shipping-cost gap flagged as
-- an open decision when the cart feature shipped. Seller-set, optional
-- (NULL/0 = "kargo dahil", matching the existing free-text `shipment`
-- field's spirit but as an actual chargeable amount). Same integer-TL
-- convention as `store.price` (not kurus - kurus conversion happens at
-- checkout time, same as price already does).
ALTER TABLE store ADD COLUMN shipping_fee INT NULL AFTER price;

-- Snapshot of the shipping amount actually charged on THIS order row (not
-- a lookup back to store.shipping_fee, which the seller could change
-- later) - kurus like every other money column on store_order. Usually 0
-- on every row but one in a same-seller multi-item cart checkout, since
-- items shipping together in one box are only charged once - see
-- createMultiItemCheckout()'s own doc comment.
ALTER TABLE store_order ADD COLUMN shipping_fee_kurus INT NOT NULL DEFAULT 0 AFTER amount_kurus;
