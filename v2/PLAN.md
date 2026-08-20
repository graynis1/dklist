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

**Phase 1 — Core catalog + canonical work/edition schema (schema only, not bulk population).** Book/author/publisher/translator/category browse, search (prefix-only `LIKE`, do not attempt FULLTEXT — twice abandoned on this HDD-backed instance), book detail pages (done — see `src/app/kitap/[slug]/page.tsx`: cover, categories, writers, translators, publisher, rating, like, read-status + drop stats, library toggle, readers-of-book, comments), cover-image proxy (port v1's design: never expose the raw Open Library/Amazon origin URL). Introduce the `work`/`edition` split now — `edition.work_id` FK, ratings/comments FK'd to `work_id` not `edition_id` — plus a minimal admin manual-merge tool (port the transactional reassign-then-delete pattern from v1's `EntityMerger`). Get this schema decision right now; retrofitting later is expensive.

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
