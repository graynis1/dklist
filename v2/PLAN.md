# DKList v2 — Rewrite Plan & Cloud-Agent Operating Notes

> This file is the canonical, versioned copy of the rewrite plan, kept in sync with the
> plan doc on the maintainer's local machine. If you are a cloud agent picking up work on
> this branch, **read this whole file first**, then check recent commits on `v2-rewrite`
> to see what's already landed since this snapshot was written.

## Cloud-agent operating constraints (read this before touching anything)

This repo's `v2/` app is normally developed against a **local MySQL database** the cloud
sandbox does not have access to (no `DATABASE_URL`, no VPS SSH, no local dev server to
screenshot). Concretely, that means:

- **Do not add new pages/routes/server actions that call `db.*` (Drizzle) and expect
  `next build` to succeed** — Cache Components prerendering executes that code at build
  time, and a build with no reachable database will fail on any such route. If a page
  needs data, either (a) keep it as a pure UI component that accepts data as props/args
  (no DB import), so it can be wired to a real query later by a local session, or (b) if
  you must add the DB-calling code itself, keep it in a separate, clearly-named function
  in `src/db/queries/` and do NOT import/render it from any page yet — leave that wiring
  as a TODO/comment for local verification.
- **Verify with `npx tsc --noEmit` and `npm run lint`**, not `npm run build`, for any
  work that touches `src/db/`. A plain UI-only page (no DB import) is fine to verify with
  a full `npm run build`.
- **Never touch the production VPS, SSH, Docker, or DNS/Caddy config.** All of that lives
  outside this repo and outside this sandbox's reach anyway — if you find yourself
  wanting to, stop, that's a sign the task should wait for a local session.
- **Work on a feature branch off `v2-rewrite`**, commit incrementally with clear
  messages, and push. Open a PR into `v2-rewrite` if `gh` is available; otherwise just
  ensure the branch is pushed with a clear branch name (e.g. `v2-cloud/phase1-category-ui`)
  so a local session can find and review it.
- **Leave a clear PR/commit-message note** on anything that still needs local
  verification (real DB query behavior, visual/screenshot check, EXPLAIN-plan check) —
  don't claim something is "done" if it only type-checks.
- Good candidate work for this constrained environment: **pure UI components** (no DB
  imports) built from realistic placeholder data matching the real schema shapes in
  `src/db/schema.ts`; **pure logic/utilities** (e.g. the Phase 5 fuzzy-matching
  functions — ISBN normalization, title normalization, Levenshtein/Jaro-Winkler
  similarity — these need zero DB access and are fully unit-testable in isolation);
  TypeScript types/interfaces; documentation.

---

## Context

dklist.com is a live book-catalog site (~98.5M `book` rows, ~11.3M `writer`, ~4.6M `publisher`, real users, a live marketplace with Iyzico payments) currently on Symfony/PHP + Doctrine + React (CRA/antd), running on a Contabo VPS (`dklist-vps`) with MySQL native on the same box, Cloudflare-proxied DNS, frontend on Vercel.

The site owner decided on a full from-scratch rewrite rather than incremental modernization, with a hard requirement: **the new frontend must look and feel nothing like the old one.** Stack: Next.js 16 (App Router, Cache Components) + TypeScript, Drizzle over the same live MySQL database schema (no data migration), eventual deploy on the same VPS. A large customer feature wishlist exists (AI recommendations, a duplicate-detection pipeline, a Spotify-Wrapped-style annual report, new membership/role tiers) — not detailed here, ask the repo maintainer if you need it.

This plan exists because a blind "just start coding" approach risks repeating three specific, already-paid-for lessons from v1's production history: (1) an ORM auto-sync tool silently dropping hand-tuned indexes on a 98.5M-row table (`doctrine:schema:update --force` incidents), (2) treating a spinning-HDD-backed MySQL instance like it has SSD-class random IO (the twice-abandoned FULLTEXT index build), and (3) letting "duplicate work rows" and "duplicate-detection tooling" get built as one entangled unit instead of a schema fix now + a population job later.

## Phase 0 — Foundation decisions (DONE as of 2026-08-20)

**Repo/location**: `v2/` folder at repo root, own `package.json`/Next.js app.

**Design system**: Tailwind CSS + shadcn/ui, custom editorial identity (Fraunces display serif + Geist body sans, warm terracotta accent `oklch(0.58 0.16 42)` in light / `oklch(0.68 0.17 45)` in dark, warm paper background not pure white) — deliberately zero visual continuity with v1's antd UI. Dark mode via `next-themes`, class-based. See `src/app/globals.css` for tokens, `src/components/dklist/` for the core primitives (`book-cover.tsx` renders a typeset "jacket" — no photographic covers, deliberate design choice for visual consistency).

**Next.js hosting**: will run as a long-lived Node process (`next start`) on the VPS, not Vercel serverless — needed for a real DB connection pool and eventual realtime chat. Not yet deployed there.

**Reverse proxy**: Caddy in front of v1 and v2 containers on the VPS, plain-HTTP only (Cloudflare terminates TLS at the edge already). Config prepared, not yet applied — needs the maintainer's go-ahead since it's a live-server change.

**Database strategy**:
- `drizzle-kit pull` introspection snapshot of the live prod schema, manually verified against `SHOW CREATE TABLE` for core tables (`book`, `writer`, `category`, `user`) — confirmed faithful (indexes, composite column order, types all matched). One real gap found and fixed: drizzle-kit's generated import statement omitted `tinyint` despite using it.
- **No `drizzle-kit push`, ever.** Future schema changes are hand-written `ALTER TABLE` + manually-edited `src/db/schema.ts`. Don't trust `drizzle-kit generate`'s diff engine either.
- Local dev DB is a **separate MySQL 8.4 instance the maintainer runs on their own machine** (schema-only, seeded with small fake data) — not available to cloud sessions. See the cloud-agent constraints section above.
- Known real data-quality quirk confirmed via the live schema: `writer.view_count` is a `VARCHAR(255)`, not an integer — worth a real-typed fix eventually, not attempted yet.

**Auth — DONE**: `next-auth@5.0.0-beta.32` (`src/auth.ts`) + `bcryptjs`. Faithfully ported v1's exact `UserController::login` semantics: bcrypt verify, a legacy-plaintext-password fallback-and-upgrade path (real v1 accounts predating the bcrypt migration may still have plaintext passwords — this is confirmed real, not hypothetical, matches a comment in the original PHP), identical generic error for both "no such user" and "wrong password" (user-enumeration protection), `disable`d-account rejection. JWT session strategy, no DB adapter (Auth.js's adapter table conventions don't match this schema). Required `trustHost: true` since this app self-hosts (Auth.js only auto-trusts Vercel's host header by default) — a real gotcha, without it every sign-in silently fails with `UntrustedHost`. Verified end-to-end against three seeded test accounts. Header shows avatar/username/logout when signed in, isolated in its own `<Suspense>` boundary so the rest of the page still prerenders statically.

**Cache Components (Next.js 16's current caching model)**: `cacheComponents: true` already set in `next.config.ts`. Use `'use cache'` + `cacheLife()` + `cacheTag()` on Drizzle data-access functions — this is both the ISR mechanism and the tag-based invalidation mechanism in one API. Do NOT use `unstable_cache` or route-segment `revalidate` config — those are the pre-16 model this app isn't using. Runtime-dependent reads (`cookies()`/`headers()`/`searchParams`) must be wrapped in `<Suspense>`, not left to opt the whole route dynamic — Next validates this at build time and fails loudly if a route can't produce a static shell, which is useful, not just a lint nit.

**Verified hot-path query pattern**: `getBooksByCategory()` in `src/db/queries/books.ts` uses a raw `STRAIGHT_JOIN ... FORCE INDEX (idx_book_viewcount) ... WHERE EXISTS (...)` pattern (via Drizzle's `sql` escape hatch, not the query builder) — confirmed via `EXPLAIN` against the real 98.5M-row prod table that this avoids a filesort. Any new "filter by X, sort by Y" query on `book` should follow this same pattern, not the plain query builder, until proven otherwise on a real `EXPLAIN`.

**Performance patterns to use deliberately**:
- `'use cache'` + `cacheLife` + `cacheTag` on expensive queries.
- **Keyset/cursor pagination** (`WHERE (sort_col, id) > (?, ?) ORDER BY ... LIMIT N`), never OFFSET, for anything over the book/writer/publisher tables — OFFSET pagination past ~200K rows hung indefinitely in v1.
- `generateStaticParams` for only a small hot set (top-N popular books) + `dynamicParams: true` for the long tail — never attempt to statically prerender all 98.5M book pages.
- Don't oversell Suspense/streaming as a performance fix — it improves perceived latency only, not DB load. Edge runtime is a real footgun here (mysql2 needs the Node runtime, not Edge).

## Phased roadmap

**Phase 1 — Core catalog + canonical work/edition schema (schema only, not bulk population).** Book/author/publisher/translator/category browse, search (prefix-only `LIKE`, do not attempt FULLTEXT — twice abandoned on this HDD-backed instance), book detail pages (done — see `src/app/kitap/[slug]/page.tsx`: cover, categories, writers, translators, publisher, rating, like, read-status + drop stats, library toggle, readers-of-book, comments with 2-level reply threading), cover-image proxy (port v1's design: never expose the raw Open Library/Amazon origin URL). Introduce the `work`/`edition` split now — `edition.work_id` FK, ratings/comments FK'd to `work_id` not `edition_id` — plus a minimal admin manual-merge tool (port the transactional reassign-then-delete pattern from v1's `EntityMerger`). Get this schema decision right now; retrofitting later is expensive.

**Comment reply threading (done 2026-08-21)**: ported v1's `sub_comment` table (generic `parentType`/`parentId` pointing at either a `comment` or another `subComment`) as 2-level nested replies on the book page, matching the exact depth v1's own `CommentController::getComments()` ever rendered (it doesn't recurse past two levels either, even though the schema would allow deeper chains). Found and fixed a real bug during testing: `addBookComment`/`addSubComment` didn't return the newly-inserted row's id, so an optimistically-rendered comment/reply kept a temporary negative placeholder id — replying to it immediately (before a page reload) inserted a `sub_comment` row with a garbage `parent_id` that could never match anything. Fixed by returning `result.insertId` from both insert functions (same `[result] = await db.insert(...)` pattern used in `scripts/seed-shadow.mts`) and using the real id in the optimistic UI state. Verified via Playwright: post comment → reply → nested reply, full page reload, confirmed all three persist with correct `parent_type`/`parent_id` chains via direct DB read. Comment *likes* (`comment_like` table, separate from book likes) intentionally not built yet — lower priority, needs its own notification wiring to match v1, deferred.

**Reading goal / "okuma hedefi" (done 2026-08-21, v1-parity audit extended to `ProfileController`)**: ported v1's annual reading-goal feature (`read_purpose` table + `Read.year`) — set/edit a numeric target for the current year, shown as a progress fraction/percentage against books actually marked "okudum" that year, plus a compact past-years summary. `read_purpose` has no `UNIQUE(owner_id, year)` constraint in the real prod schema, so `setReadingGoal()` does a manual find-then-update-or-insert (matching what v1's own `setReadPurpose()` does) rather than `onDuplicateKeyUpdate`, which would have silently inserted duplicate rows. Verified via Playwright + direct DB check (seeded 2 "okudum" rows, set a goal of 5, confirmed "2/5 (%40)" both immediately after saving and after a full reload).

**Writer/translator likes (done 2026-08-21)**: extended the Like feature (previously book-only) to writers and translators, matching v1's `User::$likedWriters`/`$likedTranslators` (`user_writer`/`user_translator` tables). Replaced a dead, non-functional "Takip Et" button stub on the writer page (it rendered but had no click handler or backing action) with a real like toggle; added the same to the translator page, which had no button at all. Profile page now shows "Beğenilen Yazarlar"/"Beğenilen Çevirmenler" sections (v1's `liked.writers`/`liked.translators`), linked to the respective detail pages. Verified via Playwright: like a writer, count and heart-fill state persist across a full reload, and the writer shows up in the profile's liked-writers section.

**Audit extended to WriterController/PublisherController/GeneralController (2026-08-21)**: `PublisherController` has no rating/comment/like system in v1 at all (confirmed by reading the full controller) - v2's publisher page (book listing only) is already at parity, nothing to port there. `WriterController::getWriter()` and (by direct code-mirror) `TranslatorController` do have a Score-based rating system separate from the Like feature added earlier - generalized `src/db/queries/rating.ts` (previously book-only) to `rateWriter`/`rateTranslator`, each updating the denormalized `writer.score`/`translator.score` column exactly like `rateBook` does for `book.score`. New shared `RateEntityControl` client component (parameterized over a pre-bound server action via `.bind()`, since Next.js Server Actions support partial application across the server/client boundary). Verified via Playwright + direct DB read: rated a writer 4/5, confirmed both the `score` row and the denormalized `writer.score` column updated correctly. `GeneralController::search()` covers five categories (books, writers, translators, publishers, users) but v2's `/ara` and header search only ever covered books - extended `src/db/queries/search.ts` with `searchWriters`/`searchTranslators`/`searchPublishers`/`searchUsers` (same prefix-only `LIKE` pattern) and the `/ara` page now renders all five as separate sections. Verified via Playwright: writer and user results render with correct links.

Comment threading for writer/translator (v1's `WriterController::getWriter()` also nests comments/subComments exactly like the book page) is a real remaining gap, deferred - the comments.ts functions are currently book-specific (`BOOK_TYPE` hardcoded); generalizing them the same way rating/likes were generalized is the next natural step. Also noted, not yet built: a profile-edit form (`ProfileController::editProfile`/`updatePicture` - users can't edit their own bio/avatar/etc. in v2), the homepage's "featured"/"picks" sections still render `demoBooks` placeholder data instead of real queries (`getTopBooks`/`getTopWriters`/`getTopBlogs` from `GeneralController::getTopItems()` have no v2 equivalent yet), and v1's site-wide category nav widget (top-50-by-book-count, file-cached because a live `GROUP BY` over 50M `book_category` rows is expensive) has no v2 equivalent - `/kategori/[slug]` pages exist but nothing links to them from global nav yet.

**Comment threading generalized to writer/translator (done 2026-08-21)**: `comments.ts`'s `getBookComments`/`addBookComment` were hardcoded to `type='book'` even though the underlying `comment` table is already generic (`type` + `target_id`) - matches v1's `WriterController::getWriter()`, which nests comments/subComments on the writer page exactly like `BookController::getBook()` does. Refactored to `getEntityComments`/`addEntityComment` (parameterized over `CommentTargetType = "book"|"writer"|"translator"`), with `getBookComments`/`addBookComment` kept as thin wrappers so the book page's existing call sites didn't need to change. Extracted `BookComments` into a generic `EntityComments` component (parameterized over pre-bound server actions, same `.bind()` pattern as `RateEntityControl`/`EntityLikeButton`) and deleted the now-unused book-specific file. Writer and translator pages both got a full "Yorumlar" section with 2-level reply threading. Verified via Playwright: a regression check that book comments still work after the refactor, plus a new writer comment + reply, both confirmed via direct DB read (`comment.type='writer'`, correct `target_id`) and persistence across a full reload.

**Category discovery widget + Turkish category names (done 2026-08-21, closes the CategoryController audit item)**: found two real gaps by reading `CategoryController::getAllCategoriesForClient()`. First, the imported category taxonomy is US/Library-of-Congress subject headings, not real Turkish text (true even for `lang='tr'` books, per v1's own comment) - v1 hand-translates the ~50 most-common ones; v2's `getCategoryBySlug()` was rendering the raw English headings directly. Ported the translation table verbatim into `src/lib/category-names.ts` (`translateCategoryName()`), applied it in `getCategoryBySlug()`. Second, v1 has a site-wide "top 50 categories by book count" nav widget - expensive on the real 50M-row `book_category` table, so v1 resorted to a 24h file cache with a `flock()` stampede guard; v2 had no equivalent at all. Added `getTopCategories()` (`'use cache'` + `cacheLife('days')` is the Cache Components equivalent of that file cache, no hand-rolled locking needed) and a "Kategoriler" pill-link section on the homepage. Verified via Playwright + screenshot: renders correctly, links to real `/kategori/[slug]` pages, matches the site's visual design.

Also noted, not fixed this pass: `SiteHeader`'s "Keşfet"/"Yazarlar"/"Askıda Kitap"/"Bloglar" nav links are all `href="#"` placeholders - "Askıda Kitap"/"Bloglar" are legitimately unbuilt (Phase 3/4), but "Yazarlar" would need a writers-index/browse page that doesn't exist yet either (v2 only has `/yazar/[slug]` detail pages so far).

**Homepage wired to real data (done 2026-08-21)**: the "featured"/"picks" sections previously rendered hand-written placeholder `demoBooks` data unconditionally, regardless of what was actually in the catalog. Added `getTopBooks()` to `books.ts` (v1's `GeneralController::getTopItems()`/`getTopBooks()` - top-N by view count) and rewired the homepage to it as an async streamed section (`FeaturedSection`, matching the `CategoriesShelf`/`LatestBooksShelf` Suspense pattern already used elsewhere). Dropped the invented "genre"/editor's-pick framing (no such concept exists in v1 or the schema) in favor of "En çok görüntülenen" (most-viewed), and used the real `book.content` column as the blurb instead of hand-written demo excerpt text. Verified via Playwright + screenshot against the real seeded shadow DB - shows the actual highest-view-count book with its real writer, score, and view count. `demoBooks`/`demo-books.ts` is still used by the decorative `HeroShelf` (a visual book-stack graphic, not a data section) - left alone deliberately.

**Profile-edit form (done 2026-08-21)**: ported v1's `ProfileController::editProfile()` - users previously had no way to edit their own bio/city/job/birthdate/etc. in v2 at all. New `/profil/duzenle` page (name/surname/sex/birthDate required, matching v1's validation; birthPlace/livingCity/edu/job/biyo optional; password optional and only updated when actually provided - v1's own code comment notes this used to force resubmitting the current password on every edit, a UX/security mistake already fixed on the v1 side and matched here from the start, not reintroduced). `updateProfile()` in `profile.ts` hashes a new password with bcrypt when provided. A "Profili düzenle" link appears only on the viewer's own profile page. Verified via Playwright + direct DB read: updated name/surname/sex/birthdate/city/bio, confirmed all fields persisted correctly and the public profile page shows the updated bio immediately after redirect (cache tag invalidation confirmed correct via a direct curl re-check, after an initial Playwright false-negative that turned out to be a test-timing artifact, not a real bug). Avatar upload (`updatePicture`) deliberately not built yet - no image-upload infrastructure exists anywhere in v2 currently, a separate piece of work.

**MessageController/StoreController checked (2026-08-21)**: both are pure chat/marketplace functionality (`sendMessage`/`getConversations`/`getMessages` and `Store` add/update/favorite/etc.) - v2 has no chat or marketplace UI at all yet, so these aren't v1-parity gaps in something already built, they're net-new Phase 3 work exactly as already scoped in this plan. Confirmed rather than assumed; no action taken here, Phase 3 starts this work properly when reached.

**`original_book_id` reconciliation (found 2026-08-21, unresolved)**: a read-only prod query confirmed v1's `book.original_book_id` self-referencing FK (its edition-grouping mechanism, used by `BookController::getBook()`'s "diğer baskılar" section) is populated on 54.5M of 97.7M books (~55.7%) — real, load-bearing data, not a mostly-empty legacy column. The new `work`/`work_id` schema (migration `0001_work_edition_split.sql`) was designed without accounting for this. Before Phase 5's backfill job is built, decide: either (a) treat `original_book_id` chains as a direct seed for `work_id` grouping (a book and its `original_book_id` target should end up in the same `work`), or (b) run it through the same fuzzy-matching pipeline as everything else and let it re-derive the same groupings as a validation check. Leaning (a) since it's already-curated human/admin data, cheaper and more trustworthy than re-deriving — but this needs a deliberate decision before the backfill starts, not an assumption baked in silently.

**Phase 2 — Accounts & social.** Profile, reading status including a new "yarıda bıraktım" (dropped) status with a structured reason + drop-off %, explicit split of "kitaplığım" (ownership) from reading status, follow, ratings/comments/quotes (reorganized into clearly separated views per customer feedback), notifications. Start capturing activity events (status changes, ratings, shelf adds) with timestamps here, even though the Wrapped-style annual report isn't built until Phase 6.

**Phase 3 — Messaging & marketplace.** Chat including a "diğer mesajlar" (message requests) inbox, Askıda Kitap/marketplace with Iyzico, per-book secondhand-listing links. Minimal "listing requires admin-approved flag" gate even before the full role hierarchy exists.

**Phase 4 — Admin roles, permissions, blog.** Full role hierarchy (Kurucu — un-revocable, Admin, Yazar üye, Yayınevi üye, Kütüphaneci/Moderatör with data-entry+approval rights but no site-settings access, Member), audit log for elevated-permission actions, blog with revision-approval flow. Book-entry approval workflow.

**→ Recommended cutover candidate: end of Phase 4** (not a fixed rule — confirm with the maintainer when reached).

**Phase 5 — Duplicate-detection bulk population.** Classical fuzzy matching, not AI-dependent: (1) ISBN exact match, (2) normalized-title match, (3) title+author fuzzy similarity (Levenshtein/Jaro-Winkler/trigram, ~95% threshold), (4) optional AI review for residual ambiguous cases only, (5) manual admin approval panel. The `work_id` backfill across 98.5M rows must be batched/resumable/idempotent — same shape of long-running IO-heavy write that killed the FULLTEXT attempts twice on this hardware.

**Phase 6 — Social-polish/gamification.** Activity-based badges, hashtags, dark mode (done), homepage cover-thumbnail feed, shareable quotes/reviews, DKList Reading Score/Wrapped-style annual report.

**Phase 7 — AI features.** Gated on resolving the tension with the site owner's standing "no paid services, ever" rule — do not build assuming a paid LLM API is available without explicit confirmation.

**Phase 8 — Monetization.** Premium membership, revenue-model features.

## Verification approach

No existing automated test suite to extend. Verification is manual/operational, split by environment:
- **Cloud sessions**: `npx tsc --noEmit`, `npm run lint`, and (for DB-free code) `npm run build`.
- **Local sessions** (the maintainer, or a Claude Code session running on their machine): real DB queries against the local shadow database, `EXPLAIN` checks against the real prod DB (read-only) for new hot-path queries, Playwright screenshots for visual/UX verification, end-to-end auth/flow checks.

## Open items pending the customer/site owner (non-blocking)

- "Yazarhane" — exact scope undefined.
- Premium membership "özel durumlara insiyatif" — which special cases beyond ad-free.
- Ad country/language targeting mechanism.
- AI features' LLM hosting approach, given the no-paid-services constraint.
