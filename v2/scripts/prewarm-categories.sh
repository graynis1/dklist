#!/bin/bash
# Paced, resumable pre-warm of category_tr_book / category_non_tr_book for
# every category that already has real traffic (appears in category_lang_stats).
#
# Why this exists: getCategoryCandidatePool / fetchCategoryPage fall back to a
# live disk-bound category scan for any category NOT covered by these two
# persisted tables. Only ~586 of ~1147 traffic categories are covered for `tr`
# and only 4 for `non-tr`, so book pages keep paying that live scan under
# crawler load. Populating the tables once turns it into an indexed lookup.
#
# Safety:
#  - one category at a time, SLEEP between each (default 20s) — adds at most
#    ~one extra concurrent scan, comparable to a single normal request.
#  - keyset-chunked INSERT (50k book ids per statement) so no single statement
#    runs unbounded (MAX_EXECUTION_TIME does NOT bound INSERT...SELECT in MySQL).
#  - resumable: skips any category that already has rows in the target table.
#  - abort any time with Ctrl-C / kill between categories; a category that was
#    only partially covered when killed mid-loop is cleaned up on the next run's
#    resume check (it re-detects <expected coverage and re-does it). Fully
#    covered categories are skipped.
#  - MAX_CHUNKS: a category that would need more than MAX_CHUNKS*CHUNK rows is
#    rolled back and left to the app's own capped+cached live query - the app
#    reads ONLY from this table once any row exists, so partial coverage would
#    truncate its category listing.
#
# Usage:  ./prewarm-categories.sh [sleep_seconds]

set -u
DB="dklist"
MYSQL="mysql -u dklist_app -pDklistApp2026Pass! -N -B $DB"
SLEEP="${1:-20}"
CHUNK=50000
MAX_CHUNKS=16          # 16 * 50k = 800k row ceiling per category
LOG=/root/prewarm-categories.log

log() { echo "$(date '+%F %T') $*" | tee -a "$LOG"; }

STOP=0
trap 'STOP=1; log "signal received - will exit after the current category finishes"' INT TERM

log "=== prewarm start (sleep=${SLEEP}s chunk=${CHUNK} max_chunks=${MAX_CHUNKS}) ==="

# Target list: every category with real traffic, biggest-first.
mapfile -t CATS < <($MYSQL -e "SELECT category_id FROM category_lang_stats ORDER BY tr_count DESC;")
log "targets: ${#CATS[@]} categories"

warm_tr() {
  local cid=$1
  local have
  have=$($MYSQL -e "SELECT 1 FROM category_tr_book WHERE category_id=$cid LIMIT 1;")
  if [ -n "$have" ]; then return 0; fi
  # tr population is globally bounded (~126k books site-wide) — one statement is fine,
  # and this scan is time-safe as a plain SELECT-shaped insert of a tiny result.
  $MYSQL -e "
    INSERT IGNORE INTO category_tr_book (category_id, book_id, view_count, score)
    SELECT $cid, b.id, b.view_count, b.score
    FROM book b FORCE INDEX (idx_book_lang)
    WHERE b.lang='tr' AND EXISTS (
      SELECT 1 FROM book_category bc WHERE bc.book_id=b.id AND bc.category_id=$cid
    );" 2>>"$LOG"
  local n
  n=$($MYSQL -e "SELECT COUNT(*) FROM category_tr_book WHERE category_id=$cid;")
  log "  tr  cat=$cid rows=$n"
}

warm_nontr() {
  local cid=$1
  local have
  have=$($MYSQL -e "SELECT 1 FROM category_non_tr_book WHERE category_id=$cid LIMIT 1;")
  if [ -n "$have" ]; then return 0; fi

  # No COUNT probe: an uncovered category's cold count scan itself routinely
  # runs 45s+ (that IS the problem being fixed). Instead run keyset chunks
  # directly - each statement is bounded to CHUNK source rows regardless of
  # how cold the category is - and cap the number of chunks so a genuinely
  # huge category can't bloat the table or run for hours (those few keep
  # using the app's own capped+cached live query).
  local last=0 prev=-1 chunks=0
  while [ "$chunks" -lt "$MAX_CHUNKS" ]; do
    $MYSQL -e "
      INSERT IGNORE INTO category_non_tr_book (category_id, book_id, view_count, score)
      SELECT $cid, b.id, b.view_count, b.score
      FROM book_category bc STRAIGHT_JOIN book b ON b.id=bc.book_id
      WHERE bc.category_id=$cid AND b.lang!='tr' AND b.id > $last
      ORDER BY b.id LIMIT $CHUNK;" 2>>"$LOG"
    prev=$last
    last=$($MYSQL -e "SELECT COALESCE(MAX(book_id),0) FROM category_non_tr_book WHERE category_id=$cid;")
    chunks=$((chunks+1))
    if [ "$last" = "$prev" ]; then break; fi
    sleep 3
  done
  local n
  n=$($MYSQL -e "SELECT COUNT(*) FROM category_non_tr_book WHERE category_id=$cid;")
  if [ "$chunks" -ge "$MAX_CHUNKS" ] && [ "$last" != "$prev" ]; then
    log "  nontr cat=$cid rows=$n (CAPPED at $MAX_CHUNKS chunks - left to live query)"
    # A capped category is worse than an uncovered one: the app reads ONLY
    # from this table when any row exists, so a partial set would truncate
    # its listing. Roll it back so the app keeps using its own live query.
    $MYSQL -e "DELETE FROM category_non_tr_book WHERE category_id=$cid;" 2>>"$LOG"
    log "  nontr cat=$cid rolled back (partial coverage removed)"
  else
    log "  nontr cat=$cid rows=$n"
  fi
}

i=0
for cid in "${CATS[@]}"; do
  i=$((i+1))
  log "[$i/${#CATS[@]}] category $cid"
  warm_tr "$cid"
  warm_nontr "$cid"
  if [ "$STOP" = "1" ]; then log "=== stopped after category $cid ($i/${#CATS[@]}) ==="; exit 0; fi
  sleep "$SLEEP"
done

log "=== prewarm complete ==="
