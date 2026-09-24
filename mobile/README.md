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

## Status: first real screens (Android verified on a real emulator)

Built and end-to-end verified so far (2026-09-24/25):

- **Auth**: login screen (`(auth)/login.tsx`) against the real
  `/api/mobile/v1/auth/login`, token in `expo-secure-store`.
  `Stack.Protected` (Expo Router's own auth-flow primitive, not a hand-
  rolled redirect) gates `(auth)` vs `(tabs)` based on `AuthContext`'s
  resolved profile - no manual navigation calls anywhere, including on
  logout.
- **5-tab shell** (`(tabs)/_layout.tsx`): Akış / Keşfet / Kitaplığım /
  Mesajlar / Profil, `lucide-react-native` icons, haptic feedback on every
  tab switch and button press, safe-area-aware tab bar height.
- **Akış**: real `FlatList` against `/api/mobile/v1/feed` (wraps the same
  `getSiteFeed()` the web `/akis` page uses), pull-to-refresh, cursor
  pagination, real empty/error states.
- **Profil**: real signed-in user's name/username/email, working
  "Çıkış Yap".
- **Keşfet / Kitaplığım / Mesajlar**: honest "yakında" placeholders, not
  silently missing - real screens, just not built this pass.

Verified on a real Android emulator (`DKList_Pixel7`, API 34), not just
typechecked: fresh app launch → login with a throwaway test account →
landed in Akış → navigated every tab via real taps → real profile data →
logout → back to login screen. See `v2/PLAN.md`'s matching entry for the
full account of what was checked and two real bugs found doing it (a
backend crash-on-request bug, unrelated to mobile itself; two ESLint
`react-hooks/set-state-in-effect` false-positives).

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
| `/me` | GET | Bearer | current user's profile |
| `/feed` | GET | optional | `?cursor=<id>` for pagination; wraps the same feed the web `/akis` page uses |

Verified against the real local database (not just typechecked): a real
login with a correct/incorrect password, a valid token reaching `/me`, an
absent/invalid token being rejected, and `/feed` returning real (or
correctly empty) data - all confirmed via direct HTTP calls and, for the
full auth+feed loop, a real run on the Android emulator.

## Folder layout

```
src/
  app/          # Expo Router screens/layouts ONLY - routing, not logic
    (auth)/     # login (unauthenticated stack)
    (tabs)/     # the 5-tab authenticated shell
  api/          # backend client (config, fetch wrapper, per-feature calls)
  auth/         # token storage + AuthContext (profile state, login/logout)
  components/   # shared UI (ThemedText, Button, TextField, Avatar, BookCover, FeedCard, ComingSoon)
  theme/        # design tokens (colors/type/spacing/radius/shadow) + useTheme()
  lib/          # pure helpers (feedCopy, relativeTime) - no React, no fetch
```

Non-route code stays out of `src/app/` - that directory is scanned by Expo
Router and every file in it becomes a screen.

## Deliberately not decided/built yet

- Keşfet (search/discover), Kitaplığım (reading-status shelves), Mesajlar
  (chat) - real "yakında" placeholders exist, no logic behind them yet.
- Push notifications (Expo Push / APNs / FCM) - no device-token table on
  the backend yet either.
- 2FA login flow - the backend already returns `two_factor_required`
  correctly, but there's no code-entry screen yet; login correctly tells
  the user to use the web instead rather than failing silently.
- Refresh-token rotation - the mobile JWT is a single 30-day token for now,
  a deliberately simple choice for this phase, not a final security design.
- EAS project linkage / bundle identifiers are placeholders
  (`com.dklist.app`) - real Apple Developer / Google Play accounts needed
  before any real build or store submission.
- iOS build/testing - Android was done first per explicit instruction (this
  Windows PC can't run an iOS simulator); the design system/components are
  platform-agnostic already, but nothing has been run on iOS yet.
- Offline queueing, widgets, Live Activities, Siri Shortcuts - all in the
  separate design brief, none started.
