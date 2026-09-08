-- Hand-written migration, applied manually (never drizzle-kit push/generate).

-- Customer's explicit ask (2026-09-08): "Sisteme çok geniş kapsamlı bir
-- error log da koy da bu hataları vs olunca daha iyi bakıp anlık çözmen
-- için sana yararı olsun" (put a comprehensive error log into the system
-- so real errors can be looked at and fixed quickly). Before this, the
-- only error visibility was `docker logs` - unstructured, not searchable,
-- not queryable, and lost on container restart/log rotation. This is a
-- real, persistent, queryable record of every server-side error, wired
-- into Next.js's own `onRequestError` instrumentation hook (catches
-- errors from Server Components, Route Handlers, and Server Actions) plus
-- a client-side `global-error.tsx` boundary for render-time crashes.
CREATE TABLE error_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message TEXT NOT NULL,
  stack TEXT NULL,
  url VARCHAR(1000) NULL,
  method VARCHAR(10) NULL,
  user_id INT NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'server',
  digest VARCHAR(50) NULL,
  created_date DATETIME NOT NULL,
  KEY idx_error_log_created (created_date),
  KEY idx_error_log_digest (digest)
);
