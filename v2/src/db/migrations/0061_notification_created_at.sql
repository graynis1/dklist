-- Show when a notification arrived (customer feedback). Older rows stay NULL.
ALTER TABLE dknotifiaction ADD COLUMN created_at DATETIME NULL;
