#!/bin/sh
# Run this against the VPS right after every `docker compose up -d v2` -
# real root cause of the "aşırı yavaş" reports: this app's 'use cache'
# entries live in-process, so a container recreate wipes every one of them.
# The underlying queries themselves are already fully optimized (confirmed
# via EXPLAIN - idx_book_viewcount backward index scan, zero filesort) - the
# cold latency is genuine disk I/O on this host's HDD-backed MySQL, the same
# class of cost documented for the abandoned FULLTEXT attempts. Caching
# converts that into a one-time cost; this script makes sure a deploy pays
# it once, here, instead of leaving it for whichever real visitor happens to
# load the page first.
set -e
BASE="http://127.0.0.1:3001"
for path in / /kitaplar /ara /yazarlar /yayinevleri /cevirmenler /bloglar /akis \
            /admin/kitaplar /admin/yazarlar /admin/yayinevleri /admin/kullanicilar; do
  t=$(curl -s -o /dev/null -w '%{time_total}' "$BASE$path" || echo "fail")
  echo "$path -> ${t}s"
done
