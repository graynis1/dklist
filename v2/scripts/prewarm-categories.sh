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
#  - abort any time with Ctrl-C / kill; leftover rows are correct data, not partial
#    garbage (each chunk is its own committed statement, INSERT IGNORE).
#  - MEGA_SKIP: categories whose non-tr membership exceeds this many rows are
#    left to the app's capped+cached live query (avoids table bloat + long run).
#
# Usage:  ./prewarm-categories.sh [sleep_seconds]

set -u
DB="dklist"
MYSQL="mysql -u dklist_app -pDklistApp2026Pass! -N -B $DB"
SLEEP="${1:-20}"
CHUNK=50000
MEGA_SKIP=800000
LOG=/root/prewarm-categories.log

log() { echo "$(date '+%F %T') $*" | tee -a "$LOG"; }

log "=== prewarm start (sleep=${SLEEP}s chunk=${CHUNK} mega_skip=${MEGA_SKIP}) ==="

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

  # size probe (bounded SELECT — this one CAN be time-capped, and warms the
  # buffer pool pages the chunked inserts below will reuse)
  local total
  total=$($MYSQL -e "
    SELECT /*+ MAX_EXECUTION_TIME(30000) */ COUNT(*)
    FROM book_category bc STRAIGHT_JOIN book b ON b.id=bc.book_id
    WHERE bc.category_id=$cid AND b.lang!='tr';" 2>>"$LOG")
  if [ -z "$total" ]; then
    log "  nontr cat=$cid SKIP (size probe timed out >30s)"
    return 0
  fi
  if [ "$total" -gt "$MEGA_SKIP" ]; then
    log "  nontr cat=$cid SKIP (mega: $total rows > $MEGA_SKIP)"
    return 0
  fi

  # keyset-chunked copy; high-water mark comes from the target table's own PK
  # (fast indexed MAX), not a re-scan of the source join.
  local last=0 prev=-1
  while : ; do
    $MYSQL -e "
      INSERT IGNORE INTO category_non_tr_book (category_id, book_id, view_count, score)
      SELECT $cid, b.id, b.view_count, b.score
      FROM book_category bc STRAIGHT_JOIN book b ON b.id=bc.book_id
      WHERE bc.category_id=$cid AND b.lang!='tr' AND b.id > $last
      ORDER BY b.id LIMIT $CHUNK;" 2>>"$LOG"
    prev=$last
    last=$($MYSQL -e "SELECT COALESCE(MAX(book_id),0) FROM category_non_tr_book WHERE category_id=$cid;")
    if [ "$last" = "$prev" ]; then break; fi
    sleep 3
  done
  local n
  n=$($MYSQL -e "SELECT COUNT(*) FROM category_non_tr_book WHERE category_id=$cid;")
  log "  nontr cat=$cid rows=$n (probe said $total)"
}

i=0
for cid in "${CATS[@]}"; do
  i=$((i+1))
  log "[$i/${#CATS[@]}] category $cid"
  warm_tr "$cid"
  warm_nontr "$cid"
  sleep "$SLEEP"
done

log "=== prewarm complete ==="
