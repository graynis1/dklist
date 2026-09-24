-- Real customer ask (2026-09-24): "blog alanının aynısı gibi bir tane
-- videolar sekmesi ekle... youtube video linki eklenerek olacak admin
-- panelden" (add a Videos tab like the blog area - done by adding a
-- YouTube link from the admin panel).
--
-- v1's `youtube` table already exists on real production with 6 real rows
-- (genuine author-interview videos, confirmed via a direct read-only
-- query) - v1's own YoutubeController never got a v2 admin panel/public
-- page (see PLAN.md's earlier controller sweep), so this real content has
-- sat unused. Extending this real table rather than starting a parallel
-- one and abandoning it.
--
-- v1's own shape (title + raw `embeded_code` iframe HTML + a `view` slot
-- number for exactly two homepage embeds) doesn't match what's being built
-- now: the new admin form takes a plain YouTube URL/link (per the
-- customer's own words), and a real public "Videolar" section needs a slug
-- + created date + view count, matching blog's own fields. `embeded_code`
-- is kept (now nullable) for the 6 legacy rows/any future direct-HTML
-- need, but the new admin flow only ever writes `youtube_video_id` (the
-- extracted video ID) - safer than trusting/replaying arbitrary admin-typed
-- HTML back into our own page, and lets every video render through one
-- consistent, privacy-enhanced (youtube-nocookie.com) iframe built by us.
-- `view` (the old homepage-slot concept) is left untouched, not surfaced
-- in the new admin UI - a different, narrower mechanism than what's asked
-- for here.

ALTER TABLE youtube
  MODIFY COLUMN embeded_code LONGTEXT NULL,
  ADD COLUMN youtube_video_id VARCHAR(20) NULL AFTER embeded_code,
  ADD COLUMN slug VARCHAR(255) NULL AFTER title,
  ADD COLUMN created_date DATE NULL AFTER youtube_video_id,
  ADD COLUMN view_count BIGINT NOT NULL DEFAULT 0 AFTER created_date;

-- Real, malformed leading-space data quality issue on several of the 6
-- existing titles (confirmed via a direct read) - fixed here since this
-- migration already touches every one of these rows for the backfill below.
UPDATE youtube SET title = TRIM(title);

-- Backfill for the 6 real existing rows - slug/video-id computed by hand
-- (via the app's own slugify() algorithm) from each row's real title and
-- embeded_code, not guessed. `created_date` has no real original value to
-- recover (v1 never tracked one), so it's set to the backfill date, same
-- honest choice already made for get-the-schema-ready-now backfills
-- elsewhere in this project.
UPDATE youtube SET slug = 'zenife-pinar-ile-kitaplari-ve-edebiyat-uzerine-konustuk-1', youtube_video_id = 'QU5n4dYxfzQ', created_date = CURDATE() WHERE id = 1;
UPDATE youtube SET slug = 'tulin-baturu-ocak-ile-kitaplari-uzerine-2', youtube_video_id = 'P9ZZP3FBFx8', created_date = CURDATE() WHERE id = 2;
UPDATE youtube SET slug = 'layikhan-ozder-ile-edebiyat-ve-kitaplari-uzerine-3', youtube_video_id = '846Bnh367W4', created_date = CURDATE() WHERE id = 3;
UPDATE youtube SET slug = 'gulus-turkmen-ile-sohbet-4', youtube_video_id = 'jEZffdp7iHE', created_date = CURDATE() WHERE id = 4;
UPDATE youtube SET slug = 'cevat-cirak-balkanlarda-kalan-cocuklugum-kitabini-anlatiyor-5', youtube_video_id = 'TDgCtQy2FII', created_date = CURDATE() WHERE id = 5;
UPDATE youtube SET slug = 'aksel-tanriverdi-ayaz-yurekler-kitabini-tanitiyor-6', youtube_video_id = 'ZOnNyyb2-q4', created_date = CURDATE() WHERE id = 6;

ALTER TABLE youtube
  MODIFY COLUMN slug VARCHAR(255) NOT NULL,
  MODIFY COLUMN created_date DATE NOT NULL,
  ADD UNIQUE INDEX idx_youtube_slug (slug);
