-- Hand-written migration, applied manually (never drizzle-kit push/generate).
-- Applied to local dklist_shadow dev DB only. NOT YET applied to prod -
-- same standing rule as every other schema change this project has made.
--
-- "Book DNA" - maintainer's explicit ask: local/self-hosted AI only, no
-- GPU-dependent chatbot, no paid API. Stores a 384-dim sentence embedding
-- (Xenova/paraphrase-multilingual-MiniLM-L12-v2, runs on CPU via ONNX,
-- ~10ms/book once the model is warm) computed from each book's
-- name+orgName+content, so "Benzer Kitaplar" can be re-ranked by actual
-- content/theme similarity instead of only category+score. Computed at
-- write time (book creation/approval), never inside a cached read path.

CREATE TABLE book_embedding (
  book_id INT NOT NULL PRIMARY KEY,
  embedding JSON NOT NULL,
  model VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT FK_book_embedding_book FOREIGN KEY (book_id) REFERENCES book (id) ON DELETE CASCADE
);
