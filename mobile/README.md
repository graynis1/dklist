# DKList Mobile

Native iOS + Android app for [dklist.com](https://dklist.com), built on Expo
(React Native + TypeScript). Consumes the existing `v2/` Next.js backend's
`/api/mobile/v1/*` REST API - no separate backend, no data migration.

Not a WebView wrapper anywhere in this app - every screen is real native
React Native components (checked: no `react-native-webview` dependency, no
site-scraping). Design ported from `referans/DKList iOS App.dc.html` (a
Claude-Design mockup handed over 2026-09-24) - same palette/type/radii, not
a reinterpretation, but with real backend data and native-only touches
(haptics, safe-area handling) the static mockup couldn't show.

## Status: every tab and every secondary screen is real and backend-connected

Built and end-to-end verified on a real Android emulator (2026-09-24/25):

**Core**
- **Auth**: login (`(auth)/login.tsx`) against the real
  `/api/mobile/v1/auth/login`, token in `expo-secure-store`, full 2FA
  round trip (code field appears on `two_factor_required`, resubmits with
  `code`). `Stack.Protected` gates `(auth)` vs `(tabs)` on `AuthContext`'s
  resolved profile - no manual navigation calls anywhere.
- **5-tab shell**: Akış / Keşfet / Kitaplığım / Mesajlar / Profil,
  `lucide-react-native` icons, haptics, safe-area-aware tab bar.
- **Akış**: real feed (`getSiteFeed()`, pull-to-refresh, cursor
  pagination) plus a real post composer ("Ne düşünüyorsun?" →
  `createFeedPost()`) that now also supports an attached photo
  (`expo-image-picker`, multipart) and/or a linked catalog book
  (inline search picker, reusing `/search`); every card's actor jumps
  to their profile and its
  target (book/writer/translator/publisher/another user, via
  `resolveFeedTargetHref`) jumps to that entity's own detail screen.

**Catalog**
- **Keşfet**: debounced search across books/writers/translators/
  publishers/users, all five kinds now tap through to a real screen.
- **Book detail**: pooled/own score, read-status pills, 10-star rating,
  a like button, view+post comments, and "Listeye Ekle" (add to any of
  the signed-in user's own reading lists).
- **Yazar / Çevirmen / Yayınevi detail screens**: bio, book grid, a
  like/follow toggle.
- **Kitaplığım**: reading-status shelves with counts, tap-through to
  book detail.

**Social**
- **Mesajlar**: conversation list (requests + conversations), unread
  badges, a real chat thread (5s poll, working composer).
- **Profil**: rebuilt into a real menu hub (own identity + email, then
  Profilimi Görüntüle / Bildirimler / Favorilerim / Listelerim / Rozet
  Galerisi / Puan Tablosu / Hesap Ayarları), not a bare placeholder.
- **Other users' profiles** (`profil/[username]`): follow/unfollow,
  follower/following counts, badges, a privacy-aware library view (a
  private profile's shelves are hidden from non-followers, same rule as
  the web).
- **Bildirimler**: real notification list, unread badge on Akış's bell,
  mark-all-read, delete-all.
- **Favorilerim**: liked writers/translators/publishers.
- **Listelerim** / **Liste detail**: create/view/delete reading lists,
  add/remove books (from the list itself or from any book detail screen).
- **Hesap Ayarları**: edit name/surname/bio/city/password, privacy and
  2FA toggles - both persist to the real database.
- **Rozet Galerisi** / **Puan Tablosu**: the public badge gallery (real
  earned-by counts) and the weekly points leaderboard (plus the caller's
  own rank even when outside the visible list).

Verified via real taps on a real Android emulator (`DKList_Pixel7`,
API 34) across several passes, not just typechecked - including full
round trips like create-list → add-a-book-from-its-detail-screen →
confirm-in-list-detail, a profile edit that persisted to the database, a
follow/unfollow toggle, a 2FA login using a real generated OTP (read
from the database, since there's no way to receive the mailed code in
this dev environment), and a feed post that rendered correctly
afterward. See `v2/PLAN.md`'s matching entries for the full account of
what was checked and the real bugs found along the way (a backend
crash-on-request bug, an `updateTag()`-from-Route-Handler bug hit in
three different query files, a `FeedCard` gap where standalone posts
never rendered their own text, a corrupted Expo Router typed-routes
cache after heavy hot-reloading, and a `curl`-specific Turkish-character
encoding bug in this dev environment that was initially mistaken for an
app bug twice before being isolated and ruled out).

**Content, community, commerce (2026-09-25)** - closed out every
remaining "not built yet" item from the previous pass:
- **Comment reply threads**: "Yanıtla" composer on `kitap/[slug]`, two
  levels of nested replies rendered.
- **Bloglar / Videolar**: browse + detail screens; blog's Quill-authored
  HTML is stripped to clean plain text (`lib/stripHtml.ts`) since mobile
  has no HTML renderer - a real, documented formatting loss (no bold/
  italic), not pretended away; video playback hands off to the real
  YouTube app/browser via `Linking.openURL` rather than embedding a
  player (the one deliberate exception to this app's "no WebView" rule).
- **Kulüpler** (book clubs): browse, detail, join/leave, plus a
  "Kulüp Yönetimi" panel for the owner (or Admin/Mod) - toggle
  join-approval, approve/reject pending requests, remove a member.
- **Kategoriler**: browse + category detail with a Popülerlik/Puan sort
  toggle; a huge category's timeout is surfaced as a graceful Turkish
  error, not a crash.
- **Askıda Kitap** (marketplace): browse/filter, listing detail (photo
  carousel, favorite, add-to-cart), **Sepetim** (per-seller checkout with
  a shipping form), **Siparişlerim** (buyer/seller roles), **İlanlarım**
  (now with a real "+ Yeni İlan" creation flow: multi-photo picker via
  `expo-image-picker`, free/paid toggle, price/stock/shipping fields -
  multipart upload straight to the same `createStore()` the web form
  uses, so a new listing lands in the same pending-approval queue).
  Checkout for both marketplace listings and Premium hands off to
  İyzico's hosted checkout page via `expo-web-browser`'s in-app browser
  sheet - a real native modal, not an embedded WebView, and the app
  never touches raw card data.
- **Premium** and **Puan Mağazası** (redeem points for rewards, equip a
  profile frame).
- **Push notifications**: backend is fully live (`push_token` table,
  `/push-token` register/unregister route, wired into every
  `addNotification()` call via Expo's push HTTP API). The mobile client
  (`api/pushNotifications.ts`) requests permission and registers a token
  on login, unregisters on logout - but **this has never actually
  delivered a push in testing**: Expo Go on SDK 53+ throws just from
  importing `expo-notifications`, so the client lazy-loads that module
  and no-ops entirely unless both an EAS project (`extra.eas.projectId`)
  and a real development build exist - neither does yet. Verified so far
  is only that the no-op path is safe (login/logout don't crash); real
  delivery needs `eas init` + `npx expo run:android` and hasn't been
  attempted.

## Why Expo (React Native), not separate Swift/Kotlin apps

One TypeScript codebase covering iOS *and* Android, maintainable by the same
person/team already building the Next.js backend - two fully separate native
codebases would double every future screen's work indefinitely, which isn't
proportionate here. Expo specifically (not bare React Native) for its
managed native-module ecosystem (push notifications, secure storage, SF
Symbols via `expo-symbols`, EAS cloud builds - no local Xcode/Android Studio
required to ship). This still targets a genuinely native look/feel, not a
WebView wrapper - confirmed by what's actually in `package.json`.

## Running locally

```bash
cd mobile
npm install
cp .env.example .env.local   # then edit EXPO_PUBLIC_API_BASE_URL if needed
npx expo start
```

The backend must be running too: `cd v2 && npm run dev` (default
`http://localhost:3000`).

- **Android emulator**: use `10.0.2.2` instead of `localhost` in
  `EXPO_PUBLIC_API_BASE_URL` - the emulator's own alias for the host
  machine (not a typo, not the emulator's real IP).
- **Physical device**: use your computer's actual LAN IP instead - a phone
  can't resolve either `localhost` or `10.0.2.2` as your machine.

`MOBILE_JWT_SECRET` should be set in `v2/.env.local` for the mobile login
route to sign tokens; it falls back to the existing `AUTH_SECRET` if unset
so this doesn't break a fresh clone, but a dedicated secret is the right
setup before this ships for real (rotating one should never affect the
other's tokens).

### Android SDK/emulator setup (this was done once already on the
maintainer's own PC - only needed again on a fresh machine)

No Android Studio GUI wizard needed - the SDK is set up headlessly:

1. Install a JDK (`winget install Microsoft.OpenJDK.17`) and Android Studio
   itself if you want the GUI too (`winget install Google.AndroidStudio`) -
   the GUI isn't required for any of the steps below.
2. Download the real "command line tools only" package from
   `https://dl.google.com/android/repository/commandlinetools-win-<build>_latest.zip`
   (check `https://developer.android.com/studio#command-line-tools-only`
   for the current build number/checksum - don't reuse an old one) and
   extract it to `<sdk-root>/cmdline-tools/latest/`.
3. `sdkmanager --licenses`, then install `platform-tools`, `emulator`,
   `platforms;android-34`, `system-images;android-34;google_apis;x86_64`.
4. `avdmanager create avd -n DKList_Pixel7 -k "system-images;android-34;google_apis;x86_64" -d pixel_7`,
   then `emulator -avd DKList_Pixel7`.
5. Install Expo Go on the emulator (`adb install`) matching this project's
   exact SDK version (`57.0.9` as of writing - check
   `https://api.expo.dev/v2/versions/latest`'s `sdkVersions["57.0.0"]
   .androidClientUrl` for the current one, don't assume it stays the same).
6. Open the project: `adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081"`
   (with `adb reverse tcp:8081 tcp:8081` set up first, or use the
   emulator's own `10.0.2.2` alias in the URL instead of `127.0.0.1`).

`ANDROID_HOME`/`JAVA_HOME`/the SDK's `platform-tools`+`emulator`+
`cmdline-tools/latest/bin` on `PATH` are already persisted for this
Windows user account - a fresh terminal should pick them up without
re-exporting anything.

## Backend contract (`v2/src/app/api/mobile/v1/`)

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/health` | GET | none | connectivity/version check |
| `/auth/login` | POST | none | `{username, password, code?}` → `{token, user}` or `two_factor_required`/`suspended` |
| `/me` | GET / POST | Bearer | profile; POST updates name/surname/bio/city/password/privacy/2FA |
| `/me/edit` | GET | Bearer | full editable-profile fields for the account-settings form |
| `/feed` | GET | optional | `?cursor=<id>` for pagination; wraps the same feed the web `/akis` page uses |
| `/feed/post` | POST | Bearer | `{text}` - text-only status post (see deferred items below) |
| `/search` | GET | optional | `?q=` across books/writers/translators/publishers/users |
| `/library` | GET | Bearer | reading-status shelves for the signed-in user |
| `/library/status` | POST | Bearer | `{bookId, status}` sets/clears a read status |
| `/book/[slug]` | GET | optional | book detail + pooled/own score + status + like state + comments |
| `/book/[slug]/rate` | POST | Bearer | `{value}` 1-10 |
| `/book/[slug]/like` | POST | Bearer | toggle like |
| `/book/[slug]/comment` | POST | Bearer | `{text}` |
| `/writer\|translator\|publisher/[slug]` | GET | optional | entity detail + books + like state |
| `/writer\|translator\|publisher/[slug]/like` | POST | Bearer | toggle like/follow |
| `/profile/[username]` | GET | optional | public profile + follow counts + privacy-aware badges/library |
| `/profile/[username]/follow` | POST | Bearer | toggle follow |
| `/notifications` | GET / DELETE | Bearer | list + unread count; DELETE (`?id=`) removes one or (no query) all |
| `/notifications/read-all` | POST | Bearer | mark all read |
| `/favorites` | GET | Bearer | liked writers/translators/publishers |
| `/lists` | GET / POST | Bearer | the caller's reading lists; POST creates one |
| `/lists/[slug]` | GET / DELETE | Bearer\* | list detail (public lists readable without auth); DELETE (owner only) |
| `/lists/[slug]/books` | POST / DELETE | Bearer | add/remove a book |
| `/badges` | GET | none | public badge gallery |
| `/leaderboard` | GET | optional | weekly leaderboard + caller's own rank |
| `/messages/conversations` | GET | Bearer | merged requests + conversations |
| `/messages/thread/[username]` | GET | Bearer | full message history with one user |
| `/messages/send` | POST | Bearer | `{username, text}` |
| `/comment/[id]/reply` | POST | Bearer | `{text}` - reply to a comment |
| `/blog` / `/blog/[slug]` | GET | optional | list / detail (+ like state, view-count increment) |
| `/blog/[slug]/like` | POST | Bearer | toggle like |
| `/video` / `/video/[slug]` | GET | optional | list / detail (+ view-count increment) |
| `/clubs` / `/clubs/[slug]` | GET | optional | list / detail (+ membership state) |
| `/clubs/[slug]/join` \| `/leave` | POST | Bearer | join/leave a club |
| `/clubs/[slug]/requests` | GET | Bearer | owner/mod: pending join requests |
| `/clubs/[slug]/requests/[userId]?action=approve\|reject` | POST | Bearer | owner/mod: respond to a request |
| `/clubs/[slug]/approval` | POST | Bearer | owner/mod: `{requiresApproval}` |
| `/clubs/[slug]/members/[userId]` | DELETE | Bearer | owner/mod: remove a member |
| `/categories` / `/category/[slug]` | GET | optional | top categories / a category's book list |
| `/store` / `/store/[slug]` | GET | optional | marketplace listing list / detail |
| `/store` | POST | Bearer | multipart: create a new listing (same `createStore()` as web) |
| `/store/[slug]/favorite` \| `/cart` | POST | Bearer | toggle favorite / cart membership |
| `/cart` | GET | Bearer | cart grouped by seller |
| `/cart/checkout` | POST | Bearer | shipping fields → `{paymentPageUrl}` |
| `/orders` | GET | Bearer | `?role=buyer\|seller` |
| `/my-listings` | GET | Bearer | the caller's own marketplace listings |
| `/premium` | GET | optional | settings + the caller's premium status |
| `/premium/checkout` | POST | Bearer | → `{paymentPageUrl}` |
| `/point-store` | GET | Bearer | active rewards + redeemed state + balance + equipped frame |
| `/point-store/redeem` \| `/equip` | POST | Bearer | redeem a reward / equip a frame |
| `/push-token` | POST / DELETE | Bearer | register/unregister an Expo push token (see push notifications above) |

Verified against the real local database (not just typechecked): every
route above has been exercised with a real signed-in test account (curl
or the app itself), including full read/write round trips - a profile
edit that persisted, a follow toggle, a list create→add-book→verify
chain, a real posted status update, and a 2FA login using a real
generated OTP.

## Folder layout

```
src/
  app/          # Expo Router screens/layouts ONLY - routing, not logic
    (auth)/     # login (unauthenticated stack)
    (tabs)/     # the 5-tab authenticated shell
    kitap/, yazar/, cevirmen/, yayinevi/, profil/, liste/, mesajlar/
                # dynamic detail screens reachable from more than one tab
  api/          # backend client (config, fetch wrapper, per-feature calls)
  auth/         # token storage + AuthContext (profile state, login/logout)
  components/   # shared UI (ThemedText, Button, TextField, Avatar, BookCover, FeedCard, ComingSoon)
  theme/        # design tokens (colors/type/spacing/radius/shadow) + useTheme()
  lib/          # pure helpers (feedCopy, feedNav, relativeTime) - no React, no fetch
```

Non-route code stays out of `src/app/` - that directory is scanned by Expo
Router and every file in it becomes a screen.

## Deliberately not decided/built yet

Every screen-level feature from the web app now has a mobile
equivalent. What's left is either infrastructure that needs an account/
credential the maintainer doesn't have yet, or genuinely deeper work
than a single pass justifies:
- **Real push delivery** - see the push-notifications entry above; blocked
  on `eas init` (no EAS project linked yet) and a development build
  (Expo Go can't receive remote push at all on SDK 53+). The backend and
  client code are both done and safe to leave in place either way.
- **Production write-path verification** - every route above has been
  exercised against the local dev database; production has only been
  checked read-only (`curl` against `/badges`, `/search`, `/leaderboard`
  after each deploy). A `curl`-based production login attempt was
  refused by Claude Code's own auto-mode safety classifier as a
  production write; this is an honest gap, not a silent assumption -
  the local/production code is identical, but a live write round trip
  on prod itself is unverified.
- **Club admin editing** - membership moderation is built (see below);
  editing a club's own name/description/current-book, and deleting a
  club, are still web-only.
- **Comment replies deeper than 2 levels** - `kitap/[slug]` renders a
  reply and one level of replies-to-that-reply; v1's data model allows
  deeper nesting than that.
- **Refresh-token rotation** - the mobile JWT is a single 30-day token
  for now, a deliberately simple choice for this phase, not a final
  security design.
- **EAS project linkage / bundle identifiers** are placeholders
  (`com.dklist.app`) - real Apple Developer/Google Play accounts needed
  before any real build, push delivery, or store submission.
- **iOS build/testing** - Android was done first per explicit instruction
  (this Windows PC can't run an iOS simulator); the design system/
  components are platform-agnostic already, but nothing has run on iOS.
  This is a hard blocker (no Mac), not a scheduling choice.
- Offline queueing, widgets, Live Activities, Siri Shortcuts - all in the
  separate design brief, none started.
